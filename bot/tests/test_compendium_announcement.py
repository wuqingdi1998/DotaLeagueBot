from __future__ import annotations

from types import SimpleNamespace

import discord
import pytest

from services.compendium_announcement import (
    broadcast_compendium_announcement,
    compendium_announcement_text,
)


class FakeMember:
    def __init__(self, *, is_bot: bool = False, can_receive: bool = True) -> None:
        self.bot = is_bot
        self.can_receive = can_receive
        self.messages: list[str] = []

    async def send(self, message: str) -> None:
        if not self.can_receive:
            response = SimpleNamespace(status=403, reason="Forbidden", headers={})
            raise discord.Forbidden(response, "Direct messages are closed")
        self.messages.append(message)


class FakeGuild:
    def __init__(self, members: list[FakeMember]) -> None:
        self.members = members

    def fetch_members(self, *, limit: int | None):
        assert limit is None

        async def iterate_members():
            for member in self.members:
                yield member

        return iterate_members()


def test_compendium_announcement_uses_public_site_address(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://lsesports.ru/")

    assert compendium_announcement_text() == (
        "На сервере началась Гонка за звёздами! Выполняй ежедневные испытания, "
        "лидеры недельного рейтинга выигрывают коллекционные сеты. "
        "Компендиум: https://lsesports.ru/compendium"
    )


@pytest.mark.asyncio
async def test_compendium_announcement_reaches_humans_and_skips_bots(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://lsesports.ru")
    receiving_member = FakeMember()
    blocked_member = FakeMember(can_receive=False)
    bot_member = FakeMember(is_bot=True)
    guild = FakeGuild([receiving_member, blocked_member, bot_member])

    report = await broadcast_compendium_announcement(guild)

    assert report.sent_count == 1
    assert report.failed_count == 1
    assert report.skipped_bot_count == 1
    assert receiving_member.messages == [compendium_announcement_text()]
    assert blocked_member.messages == []
    assert bot_member.messages == []
