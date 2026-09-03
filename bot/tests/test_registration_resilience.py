import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import aiohttp
import pytest

os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_DB", "test")

import cogs.profile as profile
import utils.steam_tools as steam_tools


class FakeSteamXmlResponse:
    status = 200

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return None

    async def text(self) -> str:
        return "<profile><steamID64>76561198220409833</steamID64></profile>"


class FakeSteamXmlSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return None

    def get(self, url, **kwargs):
        return FakeSteamXmlResponse()


class SteamApiFailureWithXmlFallbackSession(FakeSteamXmlSession):
    def get(self, url, **kwargs):
        if "api.steampowered.com" in url:
            raise aiohttp.ClientConnectionError("Steam API is unavailable")
        return FakeSteamXmlResponse()


class FailingOpenDotaSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return None

    def get(self, url, **kwargs):
        raise aiohttp.ClientConnectionError("OpenDota is unavailable")


@pytest.mark.asyncio
async def test_vanity_steam_link_resolves_without_api_key(monkeypatch) -> None:
    monkeypatch.setattr(steam_tools, "STEAM_API_KEY", None)
    monkeypatch.setattr(
        steam_tools.aiohttp,
        "ClientSession",
        lambda **kwargs: FakeSteamXmlSession(),
    )

    steam_id32 = await steam_tools.resolve_steam_id(
        "https://steamcommunity.com/id/kksqqdf/"
    )

    assert steam_id32 == 260144105


@pytest.mark.asyncio
async def test_vanity_steam_link_uses_public_fallback_after_api_failure(
    monkeypatch,
) -> None:
    monkeypatch.setattr(steam_tools, "STEAM_API_KEY", "configured-key")
    monkeypatch.setattr(
        steam_tools.aiohttp,
        "ClientSession",
        lambda **kwargs: SteamApiFailureWithXmlFallbackSession(),
    )

    steam_id32 = await steam_tools.resolve_steam_id(
        "https://steamcommunity.com/id/kksqqdf/"
    )

    assert steam_id32 == 260144105


@pytest.mark.asyncio
async def test_unavailable_opendota_does_not_block_registration(monkeypatch) -> None:
    monkeypatch.setattr(
        profile.aiohttp,
        "ClientSession",
        lambda **kwargs: FailingOpenDotaSession(),
    )

    assert await profile.fetch_opendota_rank(260144105) == 0


@pytest.mark.asyncio
async def test_participant_role_does_not_require_new_user_role(monkeypatch) -> None:
    participant_role = SimpleNamespace(id=202, name="LS Cyber-tourists")
    guild = SimpleNamespace(get_role=lambda role_id: participant_role)
    member = SimpleNamespace(
        id=303,
        display_name="sea",
        roles=[],
        add_roles=AsyncMock(),
        remove_roles=AsyncMock(),
    )
    monkeypatch.setattr(profile, "NEW_USER_ROLE_ID", 101)
    monkeypatch.setattr(profile, "LEAGUE_PARTICIPANT_ROLE_ID", participant_role.id)

    await profile.update_registration_access_roles(member, guild)

    member.add_roles.assert_awaited_once_with(participant_role)
    member.remove_roles.assert_not_awaited()


@pytest.mark.asyncio
async def test_unexpected_modal_error_is_reported_to_player() -> None:
    modal = profile.RegisterModal()
    interaction = SimpleNamespace(
        user=SimpleNamespace(id=303),
        response=SimpleNamespace(is_done=lambda: True),
        followup=SimpleNamespace(send=AsyncMock()),
    )

    await modal.on_error(interaction, RuntimeError("database unavailable"))

    interaction.followup.send.assert_awaited_once()
    assert "попробуйте ещё раз" in interaction.followup.send.await_args.args[0].lower()
