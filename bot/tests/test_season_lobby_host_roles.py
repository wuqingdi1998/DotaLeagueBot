from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from services.season_lobby_host_roles import (
    SEASON_LOBBY_HOST_ROLE_ID,
    sync_season_lobby_host_roles,
)


class Result:
    def __init__(self, values: list[int]) -> None:
        self.values = values

    def scalars(self) -> list[int]:
        return self.values


class Session:
    def __init__(self, tracked: set[int], desired: set[int]) -> None:
        self.tracked = tracked
        self.desired = desired
        self.commit = AsyncMock()

    async def execute(self, statement: object, values: dict[str, int] | None = None) -> Result:
        sql = str(statement).strip()
        if sql.startswith("SELECT player_id"):
            return Result(list(self.tracked))
        if sql.startswith("SELECT DISTINCT match.host_player_id"):
            return Result(list(self.desired))
        if sql.startswith("INSERT INTO season_lobby_host_role_members"):
            self.tracked.add(values["player_id"])
        if sql.startswith("DELETE FROM season_lobby_host_role_members"):
            self.tracked.remove(values["player_id"])
        return Result([])


class Member:
    def __init__(self, role: object, has_role: bool) -> None:
        self.roles = [role] if has_role else []
        self.add_roles = AsyncMock(side_effect=self._add_role)
        self.remove_roles = AsyncMock(side_effect=self._remove_role)

    def _add_role(self, role: object, **_kwargs: object) -> None:
        self.roles.append(role)

    def _remove_role(self, role: object, **_kwargs: object) -> None:
        self.roles.remove(role)


@pytest.mark.asyncio
async def test_switches_host_role_and_removes_it_after_expiry() -> None:
    role = type("Role", (), {"id": SEASON_LOBBY_HOST_ROLE_ID})()
    previous_host = Member(role, has_role=True)
    new_host = Member(role, has_role=False)
    members = {10001: previous_host, 10002: new_host}
    guild = type("Guild", (), {
        "get_role": lambda _self, _role_id: role,
        "get_member": lambda _self, player_id: members[player_id],
    })()
    bot = type("Bot", (), {"get_guild": lambda _self, _guild_id: guild})()
    session = Session(tracked={10001, 10002}, desired={10002})

    await sync_season_lobby_host_roles(bot, session, 1)
    previous_host.remove_roles.assert_awaited_once()
    new_host.add_roles.assert_awaited_once()
    assert session.tracked == {10002}

    session.desired.clear()
    await sync_season_lobby_host_roles(bot, session, 1)
    new_host.remove_roles.assert_awaited_once()
    assert session.tracked == set()
    assert session.commit.await_count == 2
