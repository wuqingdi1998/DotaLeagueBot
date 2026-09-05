from pathlib import Path
from types import SimpleNamespace

import pytest

from services.season_nine_outreach import (
    OutreachCampaign,
    OutreachMember,
    OutreachReport,
    classify_campaign_members,
    outreach_report_text,
    send_outreach_message,
)


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0118_schedule_season_nine_outreach.sql"
).read_text(encoding="utf-8")
COG = (ROOT / "bot" / "cogs" / "season_nine_outreach.py").read_text(
    encoding="utf-8"
)
DEPLOYMENT = (ROOT / ".github" / "workflows" / "deploy.yml").read_text(
    encoding="utf-8"
)
CHECK_SCRIPT = (ROOT / "scripts" / "check.ps1").read_text(encoding="utf-8")
CONTINUOUS_CHECKS = (
    ROOT / ".github" / "workflows" / "ci.yml"
).read_text(encoding="utf-8")


class FakeRecipient:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send(self, **message: object) -> object:
        self.messages.append(message)
        return SimpleNamespace(id=987654321)


class FakeBot:
    def __init__(self, recipient: FakeRecipient) -> None:
        self.recipient = recipient

    def get_user(self, user_id: int) -> FakeRecipient | None:
        return self.recipient if user_id == 101 else None

    async def fetch_user(self, user_id: int) -> FakeRecipient:
        assert user_id == 101
        return self.recipient


def test_campaign_audience_matches_server_and_round_registration_rules() -> None:
    members = [
        OutreachMember(discord_id=101, is_bot=False),
        OutreachMember(discord_id=102, is_bot=False),
        OutreachMember(discord_id=103, is_bot=False),
        OutreachMember(discord_id=104, is_bot=False),
        OutreachMember(discord_id=105, is_bot=True),
    ]

    audience = classify_campaign_members(
        members,
        registered_player_ids={101, 102, 104},
        round_registered_player_ids={102},
    )

    assert audience.registered_player_ids == (101, 104)
    assert audience.unregistered_member_ids == (103,)
    assert audience.skipped_round_registered_count == 1
    assert audience.skipped_bot_count == 1


@pytest.mark.asyncio
async def test_campaign_sends_the_message_for_the_selected_audience() -> None:
    recipient = FakeRecipient()
    campaign = OutreachCampaign(
        title="Привет! 👋",
        registered_message="Сообщение без регистрации",
        unregistered_message="Сообщение с регистрацией",
    )

    message_id = await send_outreach_message(
        FakeBot(recipient),
        discord_id=101,
        audience="unregistered",
        campaign=campaign,
    )

    assert message_id == 987654321
    embed = recipient.messages[0]["embed"]
    assert embed.title == "Привет! 👋"
    assert embed.description == "Сообщение с регистрацией"
    allowed_mentions = recipient.messages[0]["allowed_mentions"]
    assert allowed_mentions.everyone is False
    assert allowed_mentions.users is False
    assert allowed_mentions.roles is False


def test_report_includes_delivery_totals_for_both_audiences() -> None:
    report = OutreachReport(
        registered_total=20,
        registered_sent=18,
        registered_failed=2,
        unregistered_total=30,
        unregistered_sent=25,
        unregistered_failed=5,
        skipped_round_registered_count=12,
        skipped_bot_count=3,
    )

    assert outreach_report_text(report) == (
        "✅ Рассылка девятого сезона завершена.\n\n"
        "Доставлено: **43 из 50**\n"
        "Не доставлено: **7**\n\n"
        "Зарегистрированы в базе, но не на 1-й тур: "
        "**18 из 20** доставлено, **2** не доставлено.\n"
        "Нет регистрации в базе: **25 из 30** доставлено, "
        "**5** не доставлено.\n\n"
        "Не включены в рассылку: уже зарегистрированы на 1-й тур — **12**, "
        "боты — **3**."
    )


def test_campaign_is_scheduled_for_noon_in_batches_of_ten() -> None:
    assert "2026-09-05 12:00:00+03" in MIGRATION
    assert "'league-season-9'" in MIGRATION
    assert "1," in MIGRATION
    assert "10," in MIGRATION
    assert "season_nine_registered_player_preview" in MIGRATION
    assert "season_nine_unregistered_member_preview" in MIGRATION
    assert "311247030422863882" in MIGRATION
    assert "LIMIT :batch_size" in (
        ROOT / "bot" / "services" / "season_nine_outreach.py"
    ).read_text(encoding="utf-8")
    assert "tasks.loop(seconds=2)" in COG
    assert "1|2026-09-05 12:00|10|10" in DEPLOYMENT
    assert "Season 9 outreach worker is running" in DEPLOYMENT
    assert "services/season_nine_outreach.py" in DEPLOYMENT
    assert "services/season_nine_outreach.py" in CHECK_SCRIPT
    assert "services/season_nine_outreach.py" in CONTINUOUS_CHECKS
