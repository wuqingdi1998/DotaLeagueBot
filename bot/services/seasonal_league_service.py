from sqlalchemy import select, update, func, and_, delete
from database.models import (
    SeasonalLeagueSession,
    SeasonalLeagueRegistration,
    Player,
    SessionStatus,
    PlayerStatus,
)
from datetime import datetime, timedelta


class SeasonalLeagueService:
    def __init__(self, bot_or_session):
        if hasattr(bot_or_session, "session_maker"):
            self.bot = bot_or_session
            self.session_maker = bot_or_session.session_maker
            self.session = None
            self._owns_session = True
        else:
            self.session = bot_or_session
            self.bot = None
            self.session_maker = None
            self._owns_session = False

    async def __aenter__(self):
        if self._owns_session:
            self.session = self.session_maker()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._owns_session and self.session:
            await self.session.close()

    async def is_registered(self, user_id: int) -> bool:
        session_query = select(SeasonalLeagueSession).where(
            SeasonalLeagueSession.status == SessionStatus.OPEN.value
        ).limit(1)
        res = await self.session.execute(session_query)
        active_session = res.scalar_one_or_none()

        if not active_session:
            return False

        reg_query = select(SeasonalLeagueRegistration).where(
            SeasonalLeagueRegistration.session_id == active_session.id,
            SeasonalLeagueRegistration.player_id == user_id
        )
        res = await self.session.execute(reg_query)
        registration = res.scalar_one_or_none()

        return registration is not None

    async def process_checkin(self, user_id: int):
        active_week = await self.get_active_session()
        if not active_week:
            return False, "Нет активного тура лиги."

        stmt = select(SeasonalLeagueRegistration).join(Player).where(
            SeasonalLeagueRegistration.session_id == active_week.id,
            Player.discord_id == user_id,
            Player.is_archived.is_(False),
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
            update(SeasonalLeagueSession)
            .where(SeasonalLeagueSession.is_current == True)
            .values(status=SessionStatus.FINISHED.value, is_current=False)
        )
        await self.session.execute(stmt)

        query = select(func.max(SeasonalLeagueSession.week_number)).where(
            SeasonalLeagueSession.season_number == season
        )
        result = await self.session.execute(query)
        last_week = result.scalar() or 0

        new_week_num = last_week + 1

        new_session = SeasonalLeagueSession(
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
        query = select(SeasonalLeagueSession).order_by(SeasonalLeagueSession.id.desc()).limit(1)
        result = await self.session.execute(query)
        last_session = result.scalar_one_or_none()
        if not last_session:
            return False, "В базе данных нет ни одной лиги для удаления."
        week_num = last_session.week_number
        stmt_reg = delete(SeasonalLeagueRegistration).where(
            SeasonalLeagueRegistration.session_id == last_session.id
        )
        await self.session.execute(stmt_reg)

        await self.session.delete(last_session)
        await self.session.commit()

        return True, f"Тур #{week_num} и все её регистрации были удалены."

    async def get_active_session(self):
        query = select(SeasonalLeagueSession).where(SeasonalLeagueSession.is_current == True)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def _get_current_season(self) -> int:
        query_active = select(SeasonalLeagueSession).where(SeasonalLeagueSession.is_current == True)
        result_active = await self.session.execute(query_active)
        active_session = result_active.scalar_one_or_none()

        if active_session:
            return active_session.season_number

        query = select(func.max(SeasonalLeagueSession.season_number))
        result = await self.session.execute(query)
        max_season = result.scalar()

        return max_season if max_season else 1

    async def _check_seasonal_season_reset(self, player: Player):
        current = await self._get_current_season()
        if player.last_seasonal_season_update is None or player.last_seasonal_season_update < current:
            player.seasonal_free_reg_used = 0
            player.last_seasonal_season_update = current

    async def register_player(self, user_id: int, user_role_ids: set[int], allowed_role_ids: set[int],
                              screenshot_url: str = None):
        """
        Returns (success: bool, message: str, auto_checkin: bool, used_free_slot: bool).
        Role gate: if the user has any of allowed_role_ids -> normal registration. Otherwise
        a one-per-seasonal-season "free" slot is consumed; once used, further registrations
        without the role are rejected until the seasonal season resets.
        """
        session_obj = await self.get_active_session()

        if not session_obj:
            return False, "Сейчас нет активных лиг.", False, False

        if session_obj.status != SessionStatus.OPEN.value:
            return False, "Регистрация уже закрыта!", False, False

        query_player = select(Player).where(
            Player.discord_id == user_id,
            Player.is_archived.is_(False),
        )
        result_player = await self.session.execute(query_player)
        player = result_player.scalar_one_or_none()

        if not player or player.rank_tier == 0:
            return False, "Сначала настрой профиль!", False, False

        if player.rank_tier >= 80 and not screenshot_url:
            return False, "Titan (Immortal) обязан предоставить скриншот MMR!", False, False

        query_reg = select(SeasonalLeagueRegistration).where(
            and_(
                SeasonalLeagueRegistration.session_id == session_obj.id,
                SeasonalLeagueRegistration.player_id == user_id
            )
        )
        result_reg = await self.session.execute(query_reg)
        existing_reg = result_reg.scalar_one_or_none()

        if existing_reg:
            return False, "Ты уже зарегистрирован!", False, False

        has_allowed_role = bool(user_role_ids & allowed_role_ids) if allowed_role_ids else False
        used_free_slot = False

        if not has_allowed_role:
            await self._check_seasonal_season_reset(player)
            if (player.seasonal_free_reg_used or 0) >= 1:
                return False, (
                    "⛔ У тебя нет нужной роли, и бесплатная регистрация уже использована "
                    "в этом сезоне."
                ), False, False
            player.seasonal_free_reg_used = (player.seasonal_free_reg_used or 0) + 1
            used_free_slot = True

        auto_checkin = False
        if session_obj.start_time:
            now = datetime.utcnow()
            time_until_start = session_obj.start_time - now
            if timedelta(minutes=0) < time_until_start <= timedelta(minutes=120):
                auto_checkin = True

        new_registration = SeasonalLeagueRegistration(
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
        if used_free_slot:
            msg += "\n🎟️ Использован бесплатный слот регистрации (1 на сезон)."
        if auto_checkin:
            msg += " **(Автоматический Check-in выполнен ✅)**"

        return True, msg, auto_checkin, used_free_slot

    async def get_active_registrations(self):
        stmt_week = select(SeasonalLeagueSession).order_by(SeasonalLeagueSession.id.desc()).limit(1)
        result_week = await self.session.execute(stmt_week)
        current_week = result_week.scalar_one_or_none()

        if not current_week:
            return None, []

        stmt_regs = (
            select(SeasonalLeagueRegistration, Player)
            .join(Player, SeasonalLeagueRegistration.player_id == Player.discord_id)
            .where(
                SeasonalLeagueRegistration.session_id == current_week.id,
                Player.is_archived.is_(False),
            )
            .order_by(SeasonalLeagueRegistration.chosen_role, SeasonalLeagueRegistration.mmr_snapshot.desc())
        )
        result_regs = await self.session.execute(stmt_regs)
        return current_week, result_regs.all()

    async def remove_registration(self, discord_id: int):
        stmt_week = select(SeasonalLeagueSession).order_by(SeasonalLeagueSession.id.desc()).limit(1)
        result_week = await self.session.execute(stmt_week)
        current_week = result_week.scalar_one_or_none()

        if not current_week:
            return False, "Нет активной сессии."

        stmt = select(SeasonalLeagueRegistration).where(
            SeasonalLeagueRegistration.session_id == current_week.id,
            SeasonalLeagueRegistration.player_id == discord_id
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

    async def reset_free_reg(self, discord_id: int):
        stmt = (
            update(Player)
            .where(Player.discord_id == discord_id)
            .values(seasonal_free_reg_used=0)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount or 0

    async def get_player_by_id(self, user_id: int):
        result = await self.session.execute(
            select(Player).where(
                Player.discord_id == user_id,
                Player.is_archived.is_(False),
            )
        )
        return result.scalars().first()
