from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from services.channel_announcement_delivery import (
    AnnouncementReport,
    ChannelAnnouncement,
    announcement_asset_path,
    send_announcement_report,
    send_channel_announcement,
)


ROOT = Path(__file__).resolve().parents[2]
PREVIEW_MIGRATION = (
    ROOT / "bot" / "database" / "migrations" / "0103_league_announcement_previews.sql"
).read_text(encoding="utf-8")
PRODUCTION_MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0104_season_nine_registration_announcements.sql"
).read_text(encoding="utf-8")
PUBLISH_SEASON_MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0105_publish_season_nine_registration.sql"
).read_text(encoding="utf-8")
SCHEDULE_SEASON_MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0106_schedule_season_nine_rounds.sql"
).read_text(encoding="utf-8")


class FakeChannel:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send(self, **message: object) -> object:
        self.messages.append(message)
        return SimpleNamespace(
            id=987654321,
            jump_url="https://discord.com/channels/456/123/987654321",
        )


class FakeRecipient:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send(self, **message: object) -> object:
        self.messages.append(message)
        return SimpleNamespace(id=123456789)


class FakeBot:
    def __init__(self, channel: FakeChannel) -> None:
        self.channel = channel

    def get_channel(self, channel_id: int) -> FakeChannel | None:
        return self.channel if channel_id == 123 else None

    async def fetch_channel(self, channel_id: int) -> FakeChannel:
        assert channel_id == 123
        return self.channel


class FakeReportBot:
    def __init__(self, recipient: FakeRecipient) -> None:
        self.recipient = recipient

    def get_user(self, user_id: int) -> FakeRecipient | None:
        return self.recipient if user_id == 311247030422863882 else None

    async def fetch_user(self, user_id: int) -> FakeRecipient:
        assert user_id == 311247030422863882
        return self.recipient


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

    receipt = await send_channel_announcement(
        FakeBot(channel),
        announcement,
        tmp_path,
    )

    assert receipt.message_id == 987654321
    assert receipt.message_url == (
        "https://discord.com/channels/456/123/987654321"
    )
    assert channel.messages[0]["content"] == "@everyone\nПервый тур"
    assert channel.messages[0]["file"].filename == "Reg1.png"
    allowed_mentions = channel.messages[0]["allowed_mentions"]
    assert allowed_mentions.everyone is True
    assert allowed_mentions.users is False
    assert allowed_mentions.roles is False


@pytest.mark.asyncio
async def test_announcement_report_contains_destination_and_post_link() -> None:
    recipient = FakeRecipient()
    report = AnnouncementReport(
        id=1,
        recipient_id=311247030422863882,
        description="анонс регистрации на тур №1 — Бустевички",
        channel_id=1256870455474917477,
        message_url="https://discord.com/channels/456/123/987654321",
    )

    message_id = await send_announcement_report(FakeReportBot(recipient), report)

    assert message_id == 123456789
    assert recipient.messages[0]["content"] == (
        "✅ Отправлен анонс регистрации на тур №1 — Бустевички.\n"
        "Канал: <#1256870455474917477>\n"
        "Пост: https://discord.com/channels/456/123/987654321"
    )
    allowed_mentions = recipient.messages[0]["allowed_mentions"]
    assert allowed_mentions.everyone is False
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


def test_production_queue_schedules_two_announcements_for_each_round() -> None:
    scheduled_rounds = [
        "2026-09-06 21:00:00+03",
        "2026-09-11 22:00:00+03",
        "2026-09-20 21:00:00+03",
        "2026-09-25 22:00:00+03",
        "2026-10-04 21:00:00+03",
        "2026-10-09 22:00:00+03",
        "2026-10-18 21:00:00+03",
        "2026-10-23 22:00:00+03",
        "2026-11-01 21:00:00+03",
        "2026-11-06 22:00:00+03",
        "2026-11-15 21:00:00+03",
        "2026-11-20 22:00:00+03",
        "2026-11-29 21:00:00+03",
        "2026-12-04 22:00:00+03",
    ]

    for round_number, scheduled_at in enumerate(scheduled_rounds, start=1):
        assert f"({round_number}," in PRODUCTION_MIGRATION
        assert scheduled_at in PRODUCTION_MIGRATION
        assert (ROOT / "anounce" / "Reg" / f"Reg{round_number}.png").is_file()

    assert "1256870455474917477::BIGINT, INTERVAL '5 days'" in PRODUCTION_MIGRATION
    assert "1038761680521416754::BIGINT, INTERVAL '4 days'" in PRODUCTION_MIGRATION
    assert "rounds.round_number = 1 AND audiences.audience_key = 'boosty'" in (
        PRODUCTION_MIGRATION
    )
    assert "TIMESTAMPTZ '2026-09-01 22:00:00+03'" in PRODUCTION_MIGRATION
    assert "311247030422863882::BIGINT" in PRODUCTION_MIGRATION
    assert "format('Reg%s.png', rounds.round_number)" in PRODUCTION_MIGRATION
    assert "'season9-registration-round-%s-%s'" in PRODUCTION_MIGRATION
    assert "'league-season-9'" in PRODUCTION_MIGRATION
    assert "ON CONFLICT (dedupe_key) DO NOTHING" in PRODUCTION_MIGRATION


def test_successful_announcement_publishes_season_and_queues_report() -> None:
    delivery = (
        ROOT / "bot" / "services" / "channel_announcement_delivery.py"
    ).read_text(encoding="utf-8")
    cog = (ROOT / "bot" / "cogs" / "channel_announcements.py").read_text(
        encoding="utf-8"
    )

    assert "SET status = 'registration', updated_at = NOW()" in delivery
    assert "WHERE slug = :slug AND status IN ('draft', 'planned')" in delivery
    assert "SET is_visible = TRUE, updated_at = NOW()" in delivery
    assert "AND round.round_kind = 'regular'" in delivery
    assert "discord_message_url = :message_url" in delivery
    assert "report_status = 'pending'" in delivery
    assert "deliver_pending_announcement_reports(self.bot, session)" in cog


def test_season_nine_publish_migration_opens_registration_and_regular_rounds() -> None:
    assert "slug = 'league-season-9'" in PUBLISH_SEASON_MIGRATION
    assert "status IN ('draft', 'planned')" in PUBLISH_SEASON_MIGRATION
    assert "SET is_visible = TRUE, updated_at = NOW()" in PUBLISH_SEASON_MIGRATION
    assert "round.round_kind = 'regular'" in PUBLISH_SEASON_MIGRATION


def test_season_nine_round_schedule_matches_registration_announcements() -> None:
    for round_number in range(1, 15):
        assert f"({round_number}," in SCHEDULE_SEASON_MIGRATION
        assert f"'Reg{round_number}.png'" in PREVIEW_MIGRATION
    assert "2026-09-06 21:00:00+03" in SCHEDULE_SEASON_MIGRATION
    assert "2026-12-04 22:00:00+03" in SCHEDULE_SEASON_MIGRATION
    assert "tournament.slug = 'league-season-9'" in SCHEDULE_SEASON_MIGRATION
    assert "round.round_number = schedule.round_number" in SCHEDULE_SEASON_MIGRATION


def test_production_bot_image_contains_announcement_images() -> None:
    dockerfile = (ROOT / "bot" / "Dockerfile").read_text(encoding="utf-8")
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    deploy = (ROOT / ".github" / "workflows" / "deploy.yml").read_text(
        encoding="utf-8"
    )

    assert "COPY anounce/Reg/ ./assets/channel-announcements/" in dockerfile
    assert compose.count("dockerfile: bot/Dockerfile") == 2
    assert "docker build --tag dotaleaguebot-bot:deploy --file bot/Dockerfile ." in deploy
    assert "Delivered season 9 preview announcements: 14" in deploy
    assert 'if [ "$preview_delivery" = "14|0" ]' in deploy
    assert 'if [ "$scheduled_announcements" != "28|0" ]' in deploy
