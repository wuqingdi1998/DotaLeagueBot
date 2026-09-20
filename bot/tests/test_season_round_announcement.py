from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

from services.season_round_announcement import (
    ANNOUNCEMENT_ROLE_IDS,
    UpcomingSeasonRound,
    build_announcement_message,
    fetch_announcement_recipients,
)
from utils.website_notifications import (
    SEASON_ROUND_ANNOUNCEMENT_PREVIEW_EVENT_TYPE,
    notification_outbox_message_kwargs,
)


ROOT = Path(__file__).resolve().parents[2]
COG = ROOT / "bot" / "cogs" / "season_round_announcement.py"
MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0145_season_round_announcement_preview.sql"
)
DEPLOYMENT = ROOT / ".github" / "workflows" / "deploy.yml"


def test_announcement_message_matches_approved_copy() -> None:
    season_round = UpcomingSeasonRound(
        id=91,
        round_number=3,
        name="Осенний разлом",
        scheduled_at=datetime(2026, 9, 27, 15, 0, tzinfo=timezone.utc),
        tournament_slug="league-season-9",
    )

    message = build_announcement_message(season_round, "https://lsesports.ru/")

    assert message == (
        "Привет! У нас скоро состоится следующий тур серверной лиги.\n\n"
        "Тур №3 – Осенний разлом\n"
        "Начало: <t:1790521200:F>\n"
        "До начала: <t:1790521200:R>\n"
        "Для участия нужны 10 рейтинговых побед на основной роли и 4 победы "
        "на дополнительной роли.\n"
        "https://lsesports.ru/tournaments/league-season-9?round=3\n\n"
        "Если вы уже зарегистрированы, повторно регистрироваться не нужно. "
        "Не забудьте пройти чек-ин за 2 часа до начала тура."
    )


class _Guild:
    def __init__(self, members: list[object]) -> None:
        self._members = members

    async def fetch_members(self, *, limit: int | None):
        assert limit is None
        for member in self._members:
            yield member


@pytest.mark.asyncio
async def test_audience_contains_humans_with_either_role_once() -> None:
    first_role, second_role = sorted(ANNOUNCEMENT_ROLE_IDS)
    members = [
        SimpleNamespace(id=1, bot=False, roles=[SimpleNamespace(id=first_role)]),
        SimpleNamespace(
            id=2,
            bot=False,
            roles=[SimpleNamespace(id=first_role), SimpleNamespace(id=second_role)],
        ),
        SimpleNamespace(id=3, bot=False, roles=[SimpleNamespace(id=999)]),
        SimpleNamespace(id=4, bot=True, roles=[SimpleNamespace(id=second_role)]),
    ]

    recipients = await fetch_announcement_recipients(_Guild(members))

    assert [member.id for member in recipients] == [1, 2]


def test_preview_outbox_event_is_delivered_as_plain_message() -> None:
    kwargs = notification_outbox_message_kwargs(
        SEASON_ROUND_ANNOUNCEMENT_PREVIEW_EVENT_TYPE,
        "Образец анонса тура",
        "Точный текст сообщения",
        None,
    )

    assert kwargs == {"content": "Точный текст сообщения"}


def test_admin_command_requires_confirmation_and_admin_permission() -> None:
    source = COG.read_text(encoding="utf-8")

    assert 'name="season_announce"' in source
    assert "@app_commands.guild_only()" in source
    assert "@app_commands.default_permissions(administrator=True)" in source
    assert "@app_commands.checks.has_permissions(administrator=True)" in source
    assert 'label="Отправить"' in source
    assert 'label="Отмена"' in source


def test_preview_is_queued_only_for_frokeng_and_next_regular_round() -> None:
    source = MIGRATION.read_text(encoding="utf-8")

    assert "311247030422863882::BIGINT" in source
    assert "season_round_announcement_preview" in source
    assert "tournament.status = 'active'" in source
    assert "round.round_kind = 'regular'" in source
    assert "round.scheduled_at > NOW()" in source
    assert "ORDER BY round.scheduled_at, round.id" in source
    assert "season_round_id" in source
    assert "Тур №" not in source
    assert "'cancelled'" in source


def test_deployment_sends_and_verifies_frokeng_preview() -> None:
    source = DEPLOYMENT.read_text(encoding="utf-8")

    assert "Delivered season round announcement preview to frokeng" in source
    assert "season_round_announcement_preview" in source
