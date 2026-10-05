from dataclasses import dataclass
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from services import october_compendium_roles as service


@dataclass(frozen=True)
class Role:
    name: str


@pytest.mark.parametrize("has_assignment", [False, True])
async def test_excluded_role_is_removed_even_if_assignment_is_stale(
    monkeypatch, has_assignment: bool,
) -> None:
    clan_role = Role("Морбус")
    massovka_role = Role("Массовка")
    member = SimpleNamespace(
        id=42, roles=[clan_role, massovka_role],
        remove_roles=AsyncMock(), add_roles=AsyncMock(),
    )
    guild = SimpleNamespace(
        id=1, members=[member],
        fetch_member=AsyncMock(return_value=SimpleNamespace(roles=[massovka_role])),
    )
    monkeypatch.setattr(service, "ensure_clan_roles", AsyncMock(
        return_value={"morbus": clan_role},
    ))
    await service.sync_clan_roles(guild, {42: "morbus"} if has_assignment else {})
    member.remove_roles.assert_awaited_once()
    guild.fetch_member.assert_awaited_once_with(42)
    member.add_roles.assert_not_awaited()


async def test_cleanup_detects_when_discord_still_reports_removed_role(monkeypatch) -> None:
    clan_role = Role("Морбус")
    member = SimpleNamespace(
        id=42, roles=[clan_role], remove_roles=AsyncMock(), add_roles=AsyncMock(),
    )
    guild = SimpleNamespace(
        id=1, members=[member], fetch_member=AsyncMock(return_value=member),
    )
    monkeypatch.setattr(service, "ensure_clan_roles", AsyncMock(
        return_value={"morbus": clan_role},
    ))
    with pytest.raises(RuntimeError, match="42"):
        await service.sync_clan_roles(guild, {})
