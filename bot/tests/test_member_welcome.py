from pathlib import Path
from types import SimpleNamespace

import pytest

from cogs.member_welcome import MemberWelcome, should_send_member_welcome
from services.member_welcome import send_member_welcome
from utils.website_notifications import member_welcome_embed


class FakeRecipient:
    def __init__(self) -> None:
        self.embeds = []

    async def send(self, *, embed: object) -> object:
        self.embeds.append(embed)
        return object()


@pytest.mark.asyncio
async def test_send_member_welcome_uses_shared_message() -> None:
    recipient = FakeRecipient()

    await send_member_welcome(recipient)

    assert len(recipient.embeds) == 1
    assert recipient.embeds[0].to_dict() == member_welcome_embed().to_dict()


@pytest.mark.asyncio
async def test_join_event_sends_welcome_to_human_from_configured_server(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GUILD_ID", "123")
    member = FakeRecipient()
    member.bot = False
    member.id = 456
    member.guild = SimpleNamespace(id=123)

    await MemberWelcome(SimpleNamespace()).on_member_join(member)

    assert len(member.embeds) == 1
    assert member.embeds[0].to_dict() == member_welcome_embed().to_dict()


def test_only_human_member_from_configured_server_gets_welcome() -> None:
    member = SimpleNamespace(bot=False, guild=SimpleNamespace(id=123))
    bot_member = SimpleNamespace(bot=True, guild=SimpleNamespace(id=123))

    assert should_send_member_welcome(member, "123") is True
    assert should_send_member_welcome(member, "456") is False
    assert should_send_member_welcome(member, None) is False
    assert should_send_member_welcome(bot_member, "123") is False


def test_preview_migration_queues_one_message_for_frokeng() -> None:
    migration = (
        Path(__file__).parents[1]
        / "database"
        / "migrations"
        / "0111_member_welcome_preview.sql"
    ).read_text(encoding="utf-8")
    deployment = (
        Path(__file__).parents[2] / ".github" / "workflows" / "deploy.yml"
    ).read_text(encoding="utf-8")

    assert "'member_welcome_preview'" in migration
    assert "311247030422863882" in migration
    assert "welcome_preview_status" in deployment
    assert "Delivered member welcome preview to frokeng" in deployment
