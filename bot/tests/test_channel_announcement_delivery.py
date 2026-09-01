from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from services.channel_announcement_delivery import (
    ChannelAnnouncement,
    announcement_asset_path,
    send_channel_announcement,
)


ROOT = Path(__file__).resolve().parents[2]
PREVIEW_MIGRATION = (
    ROOT / "bot" / "database" / "migrations" / "0103_league_announcement_previews.sql"
).read_text(encoding="utf-8")


class FakeChannel:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send(self, **message: object) -> object:
        self.messages.append(message)
        return SimpleNamespace(id=987654321)


class FakeBot:
    def __init__(self, channel: FakeChannel) -> None:
        self.channel = channel

    def get_channel(self, channel_id: int) -> FakeChannel | None:
        return self.channel if channel_id == 123 else None

    async def fetch_channel(self, channel_id: int) -> FakeChannel:
        assert channel_id == 123
        return self.channel


@pytest.mark.asyncio
async def test_channel_announcement_sends_image_and_everyone_ping(
    tmp_path: Path,
) -> None:
    image_path = tmp_path / "Reg1.png"
    image_path.write_bytes(b"preview-image")
    channel = FakeChannel()
    announcement = ChannelAnnouncement(
        id=1,
        channel_id=123,
        content="@everyone\nПервый тур",
        attachment_name="Reg1.png",
    )

    message_id = await send_channel_announcement(
        FakeBot(channel),
        announcement,
        tmp_path,
    )

    assert message_id == 987654321
    assert channel.messages[0]["content"] == "@everyone\nПервый тур"
    assert channel.messages[0]["file"].filename == "Reg1.png"
    allowed_mentions = channel.messages[0]["allowed_mentions"]
    assert allowed_mentions.everyone is True
    assert allowed_mentions.users is False
    assert allowed_mentions.roles is False


def test_announcement_asset_cannot_escape_its_folder(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        announcement_asset_path("../secret.txt", tmp_path)


def test_preview_queue_contains_all_fourteen_rounds_and_images() -> None:
    assert PREVIEW_MIGRATION.count("season9-registration-preview-round-") == 14
    assert PREVIEW_MIGRATION.count("1461860575259660408") == 14
    for round_number in range(1, 15):
        assert f"?round={round_number})" in PREVIEW_MIGRATION
        assert f"'Reg{round_number}.png'" in PREVIEW_MIGRATION
        assert (ROOT / "anounce" / "Reg" / f"Reg{round_number}.png").is_file()


def test_production_bot_image_contains_announcement_images() -> None:
    dockerfile = (ROOT / "bot" / "Dockerfile").read_text(encoding="utf-8")
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    deploy = (ROOT / ".github" / "workflows" / "deploy.yml").read_text(
        encoding="utf-8"
    )

    assert "COPY anounce/Reg/ ./assets/league-registration/" in dockerfile
    assert compose.count("dockerfile: bot/Dockerfile") == 2
    assert "docker build --tag dotaleaguebot-bot:deploy --file bot/Dockerfile ." in deploy
    assert "Delivered channel announcements: $sent_announcements" in deploy
    assert "available_at <= NOW() AND status <> '\\''sent'\\''" in deploy
