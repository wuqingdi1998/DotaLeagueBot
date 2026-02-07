from sqlalchemy import select, update, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import LeagueSession, LeagueRegistration, Player, SessionStatus, PlayerStatus
from datetime import datetime, timedelta, timezone

class LeagueService:
    def __init__(self, db_session: AsyncSession):
        self.session = db_session

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
        """
        Отмечает игрока как 'Check-in' (присутствует).
        """
        # 1. Находим активную неделю
        active_week = await self.get_active_session()
        if not active_week:
            return False, "Нет активной недели лиги."

        # 2. Ищем регистрацию этого игрока
        stmt = select(LeagueRegistration).join(Player).where(
            LeagueRegistration.session_id == active_week.id,
            Player.discord_id == user_id
        )
        result = await self.session.execute(stmt)
        registration = result.scalar_one_or_none()

        if not registration:
            return False, "Ты не зарегистрирован на эту неделю! Сначала нажми 'Участвовать' в анонсе."

        if registration.is_checked_in:
            return False, "Ты уже подтвердил участие! ✅"

        # 3. Ставим галочку
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

        # 2. Узнаем номер последней недели
        query = select(func.max(LeagueSession.week_number)).where(LeagueSession.season_number == season)
        result = await self.session.execute(query)
        last_week = result.scalar() or 0

        new_week_num = last_week + 1


        new_session = LeagueSession(
            season_number=season,
            week_number=new_week_num,
            status=SessionStatus.OPEN.value,
            is_current=True,
            start_time = start_time
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

        return True, f"Неделя #{week_num} и все её регистрации были удалены."


    async def get_active_session(self):
        query = select(LeagueSession).where(LeagueSession.is_current == True)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def register_player(self, user_id: int, screenshot_url: str=None):
        session = await self.get_active_session()

        if not session:
            return False, "Сейчас нет активных лиг.", False

        if session.status != SessionStatus.OPEN.value:
            return False, "Регистрация уже закрыта!", False

        query_player = select(Player).where(Player.discord_id == user_id)
        result_player = await self.session.execute(query_player)
        player = result_player.scalar_one_or_none()

        if not player or player.rank_tier == 0:
            return False, "Сначала настрой профиль!", False

        # --- СТРОГАЯ ПРОВЕРКА ТИТАНА ---
        # Никаких "and not auto_checkin". Всегда требуем скриншот.
        if player.rank_tier >= 80 and not screenshot_url:
            return False, "Titan (Immortal) обязан предоставить скриншот MMR!", False

        # Проверка на дубликат
        query_reg = select(LeagueRegistration).where(
            and_(
                LeagueRegistration.session_id == session.id,
                LeagueRegistration.player_id == user_id
            )
        )
        result_reg = await self.session.execute(query_reg)
        existing_reg = result_reg.scalar_one_or_none()

        if existing_reg:
            return False, "Ты уже зарегистрирован!", False

        # --- ЛОГИКА АВТО-ЧЕКИНА ---
        # Вычисляем её. Она пригодится, когда Титан таки скинет скрин.
        auto_checkin = False
        if session.start_time:
            now = datetime.utcnow()
            time_until_start = session.start_time - now
            if timedelta(minutes=0) < time_until_start <= timedelta(minutes=60):
                auto_checkin = True

        new_registration = LeagueRegistration(
            session_id=session.id,
            player_id=user_id,
            chosen_role=player.positions,
            mmr_snapshot=player.rank_tier,
            status=PlayerStatus.REGISTERED.value,
            screenshot_url=screenshot_url,
            is_checked_in=auto_checkin
        )

        self.session.add(new_registration)
        await self.session.commit()

        msg = f"Ты успешно зарегистрирован на неделю #{session.week_number}!"
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