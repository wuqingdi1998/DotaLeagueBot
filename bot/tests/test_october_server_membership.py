from contextlib import asynccontextmanager
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

with patch.dict(os.environ, {
    "POSTGRES_USER": "test", "POSTGRES_PASSWORD": "test", "POSTGRES_DB": "test",
}):
    from cogs import october_compendium_roles as cog_module


@pytest.mark.parametrize("contains_bot", [False, True])
async def test_server_cleanup_requires_complete_fetched_list(monkeypatch, contains_bot) -> None:
    bot_member = SimpleNamespace(id=77, roles=[])
    player = SimpleNamespace(id=42, roles=[])

    async def fetch_members(limit=None):
        assert limit is None
        if contains_bot:
            yield bot_member
        yield player

    guild = SimpleNamespace(
        id=1, unavailable=False, members=[], fetch_members=fetch_members,
    )
    bot = SimpleNamespace(guilds=[guild], user=SimpleNamespace(id=77))
    cog = cog_module.OctoberCompendiumRoles.__new__(cog_module.OctoberCompendiumRoles)
    cog.bot = bot
    session = object()

    @asynccontextmanager
    async def session_context():
        yield session

    membership_sync = AsyncMock(return_value=0)
    monkeypatch.delenv("GUILD_ID", raising=False)
    monkeypatch.setattr(cog_module, "async_session", session_context)
    monkeypatch.setattr(cog_module, "sync_october_server_membership", membership_sync)
    monkeypatch.setattr(cog_module, "load_clan_assignments", AsyncMock(return_value={}))
    monkeypatch.setattr(cog_module, "sync_clan_roles", AsyncMock())
    monkeypatch.setattr(cog_module, "delete_clan_roles", AsyncMock())
    await cog_module.OctoberCompendiumRoles.sync_roles.coro(cog)
    if contains_bot:
        membership_sync.assert_awaited_once()
        assert membership_sync.call_args.args[1] == [77, 42]
    else:
        membership_sync.assert_not_awaited()


async def test_departure_event_only_applies_to_compendium_server(monkeypatch) -> None:
    guild = SimpleNamespace(id=1)
    cog = cog_module.OctoberCompendiumRoles.__new__(cog_module.OctoberCompendiumRoles)
    cog.bot = SimpleNamespace(guilds=[guild])

    @asynccontextmanager
    async def session_context():
        yield "session"

    record = AsyncMock()
    monkeypatch.delenv("GUILD_ID", raising=False)
    monkeypatch.setattr(cog_module, "async_session", session_context)
    monkeypatch.setattr(cog_module, "record_october_server_membership", record)
    await cog.on_member_remove(SimpleNamespace(id=42, guild=SimpleNamespace(id=2)))
    record.assert_not_awaited()
    await cog.on_member_remove(SimpleNamespace(id=42, guild=guild))
    record.assert_awaited_once_with("session", 42, False)


@pytest.mark.parametrize("has_roles", [False, True])
async def test_completed_compendium_confirms_role_removal_even_when_already_empty(capsys, has_roles):
    roles = [SimpleNamespace(name=name, delete=AsyncMock()) for name in ("Морбус", "Панацея")] if has_roles else []
    await cog_module.delete_clan_roles(SimpleNamespace(id=123, roles=roles))
    for role in roles:
        role.delete.assert_awaited_once()
    assert "[OCTOBER CLANS] Roles removed for guild 123" in capsys.readouterr().out


async def test_failed_role_removal_does_not_report_success(capsys):
    role = SimpleNamespace(name="Морбус", delete=AsyncMock(side_effect=RuntimeError("denied")))
    with pytest.raises(RuntimeError, match="denied"):
        await cog_module.delete_clan_roles(SimpleNamespace(id=123, roles=[role]))
    assert "Roles removed" not in capsys.readouterr().out
