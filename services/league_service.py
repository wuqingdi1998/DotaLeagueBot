from sqlalchemy import select, update, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import LeagueSession, LeagueRegistration, Player, SessionStatus, PlayerStatus
from datetime import datetime, timedelta, timezone
import traceback


class LeagueService:
    def __init__(self, bot_or_session):
        # --- МАГИЯ: ОПРЕДЕЛЯЕМ, ЧТО НАМ ПЕРЕДАЛИ ---

        # Если у объекта есть 'session_maker', значит это БОТ (или клиент)
        if hasattr(bot_or_session, "session_maker"):
            self.bot = bot_or_session
            self.session_maker = bot_or_session.session_maker
            self.session = None  # Сессия будет создана в __aenter__
            self._owns_session = True  # Флаг: мы сами управляем сессией
        else:
            # Иначе это уже готовая СЕССИЯ (старый стиль)
            self.session = bot_or_session
            self.bot = None
            self.session_maker = None
            self._owns_session = False

    # Вход в контекстный менеджер (async with ...)
    async def __aenter__(self):
        if self._owns_session:
            self.session = self.session_maker()
        return self

    # Выход из контекстного менеджера
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._owns_session and self.session:
            await self.session.close()

    # --- МЕТОДЫ СЕРВИСА ---

    async def is_registered(self, user_id: int) -> bool:
        session_query = select(LeagueSession).where(LeagueSession.status == SessionStatus.OPEN.value).limit(1)
        res = await self.session.execute(session_query)
        active_session = res.scalar_one_or_none()

        if not active_session:
            return False

        reg_query = select(LeagueRegistration).where(
            LeagueRegistration.session_id == active_session.id,
            LeagueRegistration.player_id == user_id
        )
        res = await self.session.execute(reg_query)
        registration = res.scalar_one_or_none()

        return registration is not None

    async def process_checkin(self, user_id: int):
        active_week = await self.get_active_session()
        if not active_week:
            return False, "Нет активного тура лиги."

        stmt = select(LeagueRegistration).join(Player).where(
            LeagueRegistration.session_id == active_week.id,
            Player.discord_id == user_id
        )
        result = await self.session.execute(stmt)
        registration = result.scalar_one_or_none()

        if not registration:
            return False, "Ты не зарегистрирован на этот тур! Сначала нажми 'Участвовать' в анонсе."

        if registration.is_checked_in:
            return False, "Ты уже подтвердил участие! ✅"

        registration.is_checked_in = True
        await self.session.commit()

        return True, "Участие подтверждено! Ожидай распределения команд."

    async def create_new_week(self, start_time: datetime, season=1):
        stmt = (
            update(LeagueSession)
            .where(LeagueSession.is_current == True)
            .values(status=SessionStatus.FINISHED.value, is_current=False)
        )
        await self.session.execute(stmt)

        query = select(func.max(LeagueSession.week_number)).where(LeagueSession.season_number == season)
        result = await self.session.execute(query)
        last_week = result.scalar() or 0

        new_week_num = last_week + 1

        new_session = LeagueSession(
            season_number=season,
            week_number=new_week_num,
            status=SessionStatus.OPEN.value,
            is_current=True,
            start_time=start_time
        )

        self.session.add(new_session)
        await self.session.commit()
        await self.session.refresh(new_session)

        return new_session.id, new_week_num

    async def delete_last_week(self):
        query = select(LeagueSession).order_by(LeagueSession.id.desc()).limit(1)
        result = await self.session.execute(query)
        last_session = result.scalar_one_or_none()
        if not last_session:
            return False, "В базе данных нет ни одной лиги для удаления."
        week_num = last_session.week_number
        stmt_reg = delete(LeagueRegistration).where(LeagueRegistration.session_id == last_session.id)
        await self.session.execute(stmt_reg)

        await self.session.delete(last_session)
        await self.session.commit()

        return True, f"Тур #{week_num} и все её регистрации были удалены."

    async def get_active_session(self):
        query = select(LeagueSession).where(LeagueSession.is_current == True)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def register_player(self, user_id: int, screenshot_url: str = None):
        session_obj = await self.get_active_session()  # переименовал переменную, чтобы не путать с self.session

        if not session_obj:
            return False, "Сейчас нет активных лиг.", False

        if session_obj.status != SessionStatus.OPEN.value:
            return False, "Регистрация уже закрыта!", False

        query_player = select(Player).where(Player.discord_id == user_id)
        result_player = await self.session.execute(query_player)
        player = result_player.scalar_one_or_none()

        if not player or player.rank_tier == 0:
            return False, "Сначала настрой профиль!", False

        if player.rank_tier >= 80 and not screenshot_url:
            return False, "Titan (Immortal) обязан предоставить скриншот MMR!", False

        query_reg = select(LeagueRegistration).where(
            and_(
                LeagueRegistration.session_id == session_obj.id,
                LeagueRegistration.player_id == user_id
            )
        )
        result_reg = await self.session.execute(query_reg)
        existing_reg = result_reg.scalar_one_or_none()

        if existing_reg:
            return False, "Ты уже зарегистрирован!", False

        auto_checkin = False
        if session_obj.start_time:
            now = datetime.utcnow()
            time_until_start = session_obj.start_time - now
            if timedelta(minutes=0) < time_until_start <= timedelta(minutes=120):
                auto_checkin = True

        new_registration = LeagueRegistration(
            session_id=session_obj.id,
            player_id=user_id,
            chosen_role=player.positions,
            mmr_snapshot=player.rank_tier,
            status=PlayerStatus.REGISTERED.value,
            screenshot_url=screenshot_url,
            is_checked_in=auto_checkin
        )

        self.session.add(new_registration)
        await self.session.commit()

        msg = f"Ты успешно зарегистрирован на тур #{session_obj.week_number}!"
        if auto_checkin:
            msg += " **(Автоматический Check-in выполнен ✅)**"

        return True, msg, auto_checkin

    async def get_active_registrations(self):
        stmt_week = select(LeagueSession).order_by(LeagueSession.id.desc()).limit(1)
        result_week = await self.session.execute(stmt_week)
        current_week = result_week.scalar_one_or_none()

        if not current_week:
            return None, []

        stmt_regs = (
            select(LeagueRegistration, Player)
            .join(Player, LeagueRegistration.player_id == Player.discord_id)
            .where(LeagueRegistration.session_id == current_week.id)
            .order_by(LeagueRegistration.chosen_role, LeagueRegistration.mmr_snapshot.desc())
        )
        result_regs = await self.session.execute(stmt_regs)
        return current_week, result_regs.all()

    async def remove_registration(self, discord_id: int):
        stmt_week = select(LeagueSession).order_by(LeagueSession.id.desc()).limit(1)
        result_week = await self.session.execute(stmt_week)
        current_week = result_week.scalar_one_or_none()

        if not current_week:
            return False, "Нет активной сессии."

        stmt = select(LeagueRegistration).where(
            LeagueRegistration.session_id == current_week.id,
            LeagueRegistration.player_id == discord_id
        )
        result = await self.session.execute(stmt)
        reg = result.scalar_one_or_none()

        if reg:
            await self.session.delete(reg)
            await self.session.commit()
            return True, "Игрок удален из регистрации."
        else:
            return False, "Игрок не найден в списке регистрации."

    async def update_player_internal_rating(self, discord_id: int, rating: int):
        stmt = (
            update(Player)
            .where(Player.discord_id == discord_id)
            .values(internal_rating=rating)
        )
        await self.session.execute(stmt)
        await self.session.commit()

    async def _get_current_season(self, db_session=None) -> int:
        # Если сессия передана явно - используем её, иначе self.session
        session_to_use = db_session if db_session else self.session

        # 1. Пробуем активную сессию
        query_active = select(LeagueSession).where(LeagueSession.is_current == True)
        result_active = await session_to_use.execute(query_active)
        active_session = result_active.scalar_one_or_none()

        if active_session:
            return active_session.season_number

        # 2. Если нет активной, ищем последний сезон в БД
        query = select(func.max(LeagueSession.season_number))
        result = await session_to_use.execute(query)
        max_season = result.scalar()

        return max_season if max_season else 1

    async def _check_season_reset(self, player: Player, db_session=None):
        current_season = await self._get_current_season(db_session)

        if player.last_season_update is None or player.last_season_update < current_season:
            player.nick_changes_used = 0
            player.role_changes_used = 0
            player.last_season_update = current_season
            return True

        return False

    # --- ИСПРАВЛЕНО: ТЕПЕРЬ ИСПОЛЬЗУЕТ self.session ---
    async def change_nickname(self, user_id: int, new_nickname: str):
        # Используем self.session, которая уже открыта контекстным менеджером
        stmt = select(Player).where(Player.discord_id == user_id)
        result = await self.session.execute(stmt)
        player = result.scalar_one_or_none()

        if not player:
            return False, "❌ Игрок не найден в базе данных."

        # Передаем self.session
        await self._check_season_reset(player, db_session=self.session)

        LIMIT = 1
        if player.nick_changes_used >= LIMIT:
            return False, f"⚠️ Лимит смены ника исчерпан ({player.nick_changes_used}/{LIMIT}). Жди следующего сезона."

        old_name = player.ingame_name
        player.ingame_name = new_nickname
        player.nick_changes_used += 1

        try:
            await self.session.commit()
            remaining = LIMIT - player.nick_changes_used
            return True, (old_name, remaining)

        except Exception as e:
            await self.session.rollback()
            return False, f"❌ Ошибка базы данных: {e}"

    # --- ИСПРАВЛЕНО: ТЕПЕРЬ ИСПОЛЬЗУЕТ self.session ---
    async def change_roles(self, user_id: int, new_roles: list):
        try:
            # Используем self.session
            stmt = select(Player).where(Player.discord_id == user_id)
            result = await self.session.execute(stmt)
            player = result.scalar_one_or_none()

            if not player:
                return False, "❌ Игрок не найден."

            await self._check_season_reset(player, db_session=self.session)

            LIMIT = 2
            if player.role_changes_used >= LIMIT:
                return False, (
                    f"⛔ **Лимит исчерпан!**\n"
                    f"Ты уже менял роли {player.role_changes_used}/{LIMIT} раз за этот сезон.\n"
                    f"Следующая попытка только в новом сезоне."
                )

            now = datetime.now(timezone.utc)
            # Приводим last_role_change_at к UTC, если он offset-naive
            last_change = player.last_role_change_at
            if last_change and last_change.tzinfo is None:
                last_change = last_change.replace(tzinfo=timezone.utc)

            cooldown_period = timedelta(weeks=2)

            if last_change:
                time_passed = now - last_change

                if time_passed < cooldown_period:
                    remaining = cooldown_period - time_passed
                    days = remaining.days
                    hours = remaining.seconds // 3600

                    return False, (
                        f"⏳ **Слишком часто!**\n"
                        f"Между сменами ролей должно пройти 2 недели.\n"
                        f"Осталось ждать: **{days} д. {hours} ч.**"
                    )

            if isinstance(new_roles, list):
                roles_str = "/".join(new_roles)
            else:
                roles_str = new_roles

            player.positions = roles_str
            player.last_role_change_at = now
            player.role_changes_used += 1

            await self.session.commit()

            remaining_uses = LIMIT - player.role_changes_used
            return True, (
                f"✅ Роли обновлены: **{roles_str}**\n"
                f"Осталось смен в сезоне: **{remaining_uses}**"
            )

        except Exception as e:
            traceback.print_exc()
            return False, f"❌ Ошибка базы данных: {e}"

    async def get_player_by_id(self, user_id: int):
        result = await self.session.execute(select(Player).where(Player.discord_id == user_id))
        return result.scalars().first()