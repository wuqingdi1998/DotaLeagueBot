import sqlite3
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from services.profile_change_policy import PROFILE_CHANGE_POLICY_VERSION
from services.profile_change_service import ProfileChangeService


MIGRATION = (
    Path(__file__).parents[1]
    / "database/migrations/0127_restore_season_profile_changes.sql"
).read_text(encoding="utf-8")


def restored_players():
    with sqlite3.connect(":memory:") as database:
        database.row_factory = sqlite3.Row
        database.executescript("""
            CREATE TABLE players (
                discord_id INTEGER PRIMARY KEY,
                nick_changes_used INTEGER,
                role_changes_used INTEGER,
                last_role_change_at TEXT,
                profile_change_policy_version INTEGER,
                ingame_name TEXT DEFAULT 'Original',
                positions TEXT DEFAULT '1/2',
                is_archived INTEGER DEFAULT 0
            );
            INSERT INTO players (
                discord_id, nick_changes_used, role_changes_used,
                last_role_change_at, profile_change_policy_version, is_archived
            ) VALUES
                (1, 1, 1, '2026-09-07', 1, 0),
                (2, 0, 1, '2026-09-07', 1, 0),
                (3, 2, 2, '2026-09-01', 0, 0),
                (4, NULL, NULL, NULL, 0, 1),
                (5, 0, 0, NULL, 0, 0);
        """)
        database.executescript(MIGRATION)
        return [
            SimpleNamespace(**dict(row))
            for row in database.execute("SELECT * FROM players ORDER BY discord_id")
        ]


def test_restoration_covers_spent_unused_null_and_archived_profiles():
    players = restored_players()
    assert len(players) == 5
    for player in players:
        assert player.nick_changes_used == 0
        assert player.role_changes_used == 0
        assert player.profile_change_policy_version == PROFILE_CHANGE_POLICY_VERSION
        assert player.last_role_change_at is None
        assert player.ingame_name == "Original"
        assert player.positions == "1/2"
    assert players[3].is_archived == 1


@pytest.mark.parametrize("nickname_first", [True, False])
async def test_restored_changes_are_independent_and_cannot_be_spent_twice(nickname_first):
    player = restored_players()[0]
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = player
    session.execute.return_value = result

    async def change_nickname():
        return await ProfileChangeService(session).change_nickname(1, "Updated")

    async def change_roles():
        return await ProfileChangeService(session).change_roles(1, ["3", "4"])

    first, second = (
        (change_nickname, change_roles) if nickname_first
        else (change_roles, change_nickname)
    )
    assert (await first())[0]
    assert not (await first())[0]
    assert (await second())[0]
    assert not (await second())[0]
    assert player.nick_changes_used == 1
    assert player.role_changes_used == 1
    assert player.ingame_name == "Updated"
    assert player.positions == "3/4"
    assert session.commit.await_count == 2


@pytest.mark.parametrize("change_type", ["nickname", "roles"])
async def test_profile_modal_synchronizes_saved_player(change_type, monkeypatch):
    from cogs.ui import profile_menu

    session = AsyncMock()
    session_context = MagicMock()
    session_context.return_value.__aenter__ = AsyncMock(return_value=session)
    session_context.return_value.__aexit__ = AsyncMock(return_value=False)
    interaction = SimpleNamespace(
        user=SimpleNamespace(id=1, mention="<@1>"),
        response=SimpleNamespace(defer=AsyncMock()),
        followup=SimpleNamespace(send=AsyncMock()),
        client=SimpleNamespace(session_maker=session_context),
    )
    player = SimpleNamespace(ingame_name="Updated")
    result = MagicMock()
    result.scalar_one_or_none.return_value = player
    session.execute.return_value = result
    cog = SimpleNamespace(update_discord_profile=AsyncMock())
    monkeypatch.setattr(profile_menu, "send_log", AsyncMock())
    monkeypatch.setenv("PROFILE_ADMIN_ID", "0")

    if change_type == "nickname":
        monkeypatch.setattr(
            ProfileChangeService, "change_nickname",
            AsyncMock(return_value=(True, ("Original", 0))),
        )
        modal = SimpleNamespace(cog=cog, new_nick=SimpleNamespace(value="Updated"))
        await profile_menu.ChangeNickModal.on_submit(modal, interaction)
    else:
        monkeypatch.setattr(
            ProfileChangeService, "change_roles",
            AsyncMock(return_value=(True, "Позиции обновлены")),
        )
        modal = SimpleNamespace(cog=cog, roles_input=SimpleNamespace(value="3/4"))
        await profile_menu.ChangeRolesModal.on_submit(modal, interaction)

    cog.update_discord_profile.assert_awaited_once_with(interaction.user, player)
    interaction.followup.send.assert_awaited_once()
