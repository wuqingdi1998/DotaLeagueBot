from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest


ROOT = Path(__file__).parents[1]


class ScalarResult:
    def __init__(self, value: object) -> None:
        self.value = value

    def scalar_one(self) -> object:
        return self.value

    def scalar_one_or_none(self) -> object:
        return self.value


class RecordingSession:
    def __init__(self, result: ScalarResult) -> None:
        self.result = result
        self.statements: list[str] = []
        self.commit_count = 0

    async def execute(self, statement: object) -> ScalarResult:
        self.statements.append(str(statement))
        return self.result

    async def commit(self) -> None:
        self.commit_count += 1


@pytest.mark.asyncio
async def test_due_opening_changes_only_planned_tournaments() -> None:
    from services.tournament_registration_opening import (
        open_due_tournament_registrations,
    )

    session = RecordingSession(ScalarResult(2))

    opened_count = await open_due_tournament_registrations(session)

    assert opened_count == 2
    assert session.commit_count == 1
    statement = session.statements[0]
    assert "status = 'planned'" in statement
    assert "registration_starts_at <= NOW()" in statement
    assert "SET status = 'registration'" in statement


@pytest.mark.asyncio
async def test_next_opening_ignores_manual_statuses() -> None:
    from services.tournament_registration_opening import next_registration_opening_at

    due_at = datetime(2026, 10, 5, 9, tzinfo=timezone.utc)
    session = RecordingSession(ScalarResult(due_at))

    assert await next_registration_opening_at(session) == due_at
    assert "status = 'planned'" in session.statements[0]


def test_scheduler_and_database_wakeup_are_connected() -> None:
    cog = (ROOT / "cogs" / "tournament_registration_opening.py").read_text(
        encoding="utf-8"
    )
    migration = (
        ROOT
        / "database"
        / "migrations"
        / "0156_tournament_registration_start.sql"
    ).read_text(encoding="utf-8")

    assert "register_scheduled_job" in cog
    assert "registration_starts_at TIMESTAMPTZ" in migration
    assert "tournament_scheduler_wakeup" in (
        ROOT / "database" / "migrations" / "0133_event_driven_scheduled_tasks.sql"
    ).read_text(encoding="utf-8")
