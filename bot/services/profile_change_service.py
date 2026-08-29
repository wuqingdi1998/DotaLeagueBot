import traceback
from datetime import datetime, timezone

from sqlalchemy import select, update

from database.models import Player
from services.profile_change_policy import (
    PROFILE_CHANGE_LIMIT,
    PROFILE_CHANGE_POLICY_VERSION,
    profile_changes_are_unlimited,
)


class ProfileChangeService:
    def __init__(self, session):
        self.session = session

    async def _player(self, user_id: int) -> Player | None:
        result = await self.session.execute(
            select(Player).where(
                Player.discord_id == user_id,
                Player.is_archived.is_(False),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _prepare_limited_period(player: Player, now: datetime) -> bool:
        if profile_changes_are_unlimited(now):
            return True
        if (
            player.profile_change_policy_version
            < PROFILE_CHANGE_POLICY_VERSION
        ):
            player.nick_changes_used = 0
            player.role_changes_used = 0
            player.profile_change_policy_version = (
                PROFILE_CHANGE_POLICY_VERSION
            )
        return False

    async def change_nickname(self, user_id: int, new_nickname: str):
        player = await self._player(user_id)
        if not player:
            return False, "❌ Игрок не найден в базе данных."

        unlimited = self._prepare_limited_period(
            player,
            datetime.now(timezone.utc),
        )
        if (
            not unlimited
            and player.nick_changes_used >= PROFILE_CHANGE_LIMIT
        ):
            return False, "⚠️ Единственная смена ника уже использована."

        old_name = player.ingame_name
        player.ingame_name = new_nickname
        if not unlimited:
            player.nick_changes_used += 1

        try:
            await self.session.commit()
            remaining = (
                "без ограничений"
                if unlimited
                else PROFILE_CHANGE_LIMIT - player.nick_changes_used
            )
            return True, (old_name, remaining)
        except Exception as error:
            await self.session.rollback()
            return False, f"❌ Ошибка базы данных: {error}"

    async def change_roles(self, user_id: int, new_roles: list[str] | str):
        try:
            player = await self._player(user_id)
            if not player:
                return False, "❌ Игрок не найден."

            now = datetime.now(timezone.utc)
            unlimited = self._prepare_limited_period(player, now)
            if (
                not unlimited
                and player.role_changes_used >= PROFILE_CHANGE_LIMIT
            ):
                return False, (
                    "⚠️ Единственная смена игровых позиций уже использована."
                )

            roles_value = (
                "/".join(new_roles)
                if isinstance(new_roles, list)
                else new_roles
            )
            player.positions = roles_value
            player.last_role_change_at = now
            if not unlimited:
                player.role_changes_used += 1
            await self.session.commit()

            remaining = (
                "без ограничений"
                if unlimited
                else PROFILE_CHANGE_LIMIT - player.role_changes_used
            )
            return True, (
                f"✅ Позиции обновлены: **{roles_value}**\n"
                f"Осталось изменений: **{remaining}**"
            )
        except Exception as error:
            await self.session.rollback()
            traceback.print_exc()
            return False, f"❌ Ошибка базы данных: {error}"

    async def restore_changes(
        self,
        discord_id: int | None,
        *,
        nickname: bool,
        positions: bool,
    ) -> int:
        values: dict[str, int | None] = {}
        if nickname:
            values["nick_changes_used"] = 0
        if positions:
            values["role_changes_used"] = 0
            values["last_role_change_at"] = None
        statement = update(Player).values(**values)
        if discord_id is not None:
            statement = statement.where(Player.discord_id == discord_id)
        result = await self.session.execute(statement)
        await self.session.commit()
        return result.rowcount or 0
