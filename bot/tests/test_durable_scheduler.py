from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from services.durable_scheduler import DurableScheduler, wait_until_due_or_notified


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0133_event_driven_scheduled_tasks.sql"
).read_text(encoding="utf-8")


@pytest.mark.asyncio
async def test_scheduler_without_due_work_sleeps_until_database_notification() -> None:
    wakeup = asyncio.Event()
    waiting = asyncio.create_task(wait_until_due_or_notified(wakeup, None))

    await asyncio.sleep(0)
    assert not waiting.done()

    wakeup.set()
    await asyncio.wait_for(waiting, timeout=0.1)


@pytest.mark.asyncio
async def test_database_notification_interrupts_a_future_deadline() -> None:
    wakeup = asyncio.Event()
    due_at = datetime.now(timezone.utc) + timedelta(hours=1)
    waiting = asyncio.create_task(wait_until_due_or_notified(wakeup, due_at))

    await asyncio.sleep(0)
    wakeup.set()
    await asyncio.wait_for(waiting, timeout=0.1)


@pytest.mark.asyncio
async def test_due_deadline_returns_without_polling_delay() -> None:
    wakeup = asyncio.Event()
    due_at = datetime.now(timezone.utc) - timedelta(seconds=1)

    await asyncio.wait_for(
        wait_until_due_or_notified(wakeup, due_at),
        timeout=0.1,
    )


@pytest.mark.asyncio
async def test_independent_jobs_are_processed_concurrently() -> None:
    both_started = asyncio.Event()
    release = asyncio.Event()
    started: set[str] = set()

    class WaitingJob:
        def __init__(self, name: str) -> None:
            self.name = name

        async def process_due(self) -> None:
            started.add(self.name)
            if len(started) == 2:
                both_started.set()
            await release.wait()

        async def next_due_at(self) -> datetime | None:
            return None

    scheduler = DurableScheduler([WaitingJob("first"), WaitingJob("second")])
    processing = asyncio.create_task(scheduler._process_jobs())
    await asyncio.wait_for(both_started.wait(), timeout=0.1)
    release.set()
    await asyncio.wait_for(processing, timeout=0.1)


def test_database_changes_wake_every_persistent_scheduled_domain() -> None:
    assert "pg_notify('bot_scheduled_events'" in MIGRATION
    for table in (
        "notification_outbox",
        "channel_announcement_outbox",
        "season_lobby_notification_outbox",
        "direct_message_campaigns",
        "direct_message_campaign_recipients",
        "titan_checkup_requests",
        "season_rounds",
        "season_round_registrations",
        "season_round_checkins",
        "tournament_team_applications",
        "tournament_matches",
        "season_match_rooms",
        "draft_series",
        "draft_maps",
        "draft_invitations",
    ):
        assert f"ON {table}" in MIGRATION
    assert "FOR EACH STATEMENT" not in MIGRATION
    assert MIGRATION.count("FOR EACH ROW") >= 18


def test_deferred_events_have_no_short_interval_polling_loops() -> None:
    deferred_files = (
        ROOT / "bot" / "cogs" / "channel_announcements.py",
        ROOT / "bot" / "cogs" / "ordinary_tournament_team_channels.py",
        ROOT / "bot" / "cogs" / "website_bridge.py",
        ROOT / "bot" / "cogs" / "season_lobby_notifications.py",
        ROOT / "bot" / "cogs" / "season_nine_outreach.py",
        ROOT / "bot" / "cogs" / "season_lobby_deadlines.py",
        ROOT / "bot" / "cogs" / "fearless_draft_deadlines.py",
        ROOT / "bot" / "cogs" / "titan_checkup.py",
    )
    source = "\n".join(path.read_text(encoding="utf-8") for path in deferred_files)

    assert "tasks.loop(seconds=" not in source
    assert "asyncio.sleep(self._seconds_until_expiry" not in source
    scheduler = (
        ROOT / "bot" / "services" / "durable_scheduler.py"
    ).read_text(encoding="utf-8")
    assert 'SCHEDULER_NOTIFICATION_CHANNEL = "bot_scheduled_events"' in scheduler
    assert "add_listener(" in scheduler
