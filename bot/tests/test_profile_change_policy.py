from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

from services.profile_change_policy import (
    PROFILE_CHANGE_LIMIT,
    PROFILE_CHANGES_UNLIMITED_UNTIL,
    profile_changes_are_unlimited,
)
from services.profile_change_service import ProfileChangeService


ROOT = Path(__file__).parents[1]


def test_profile_changes_are_unlimited_until_ten_moscow_time() -> None:
    assert PROFILE_CHANGE_LIMIT == 1
    assert PROFILE_CHANGES_UNLIMITED_UNTIL == datetime(
        2026,
        9,
        6,
        7,
        0,
        tzinfo=timezone.utc,
    )
    assert profile_changes_are_unlimited(
        datetime(2026, 9, 6, 6, 59, 59, tzinfo=timezone.utc)
    )
    assert not profile_changes_are_unlimited(PROFILE_CHANGES_UNLIMITED_UNTIL)


def test_limited_period_resets_old_counters_once() -> None:
    player = SimpleNamespace(
        profile_change_policy_version=0,
        nick_changes_used=2,
        role_changes_used=2,
    )
    unlimited = ProfileChangeService._prepare_limited_period(
        player,
        PROFILE_CHANGES_UNLIMITED_UNTIL,
    )
    assert not unlimited
    assert player.nick_changes_used == 0
    assert player.role_changes_used == 0

    player.nick_changes_used = 1
    player.role_changes_used = 1
    ProfileChangeService._prepare_limited_period(
        player,
        PROFILE_CHANGES_UNLIMITED_UNTIL,
    )
    assert player.nick_changes_used == 1
    assert player.role_changes_used == 1


def test_free_period_does_not_consume_or_reset_existing_counters() -> None:
    player = SimpleNamespace(
        profile_change_policy_version=0,
        nick_changes_used=2,
        role_changes_used=2,
    )
    assert ProfileChangeService._prepare_limited_period(
        player,
        datetime(2026, 9, 6, 6, 59, 59, tzinfo=timezone.utc),
    )
    assert player.nick_changes_used == 2
    assert player.role_changes_used == 2


def test_profile_policy_has_persistent_database_marker() -> None:
    migration = (
        ROOT / "database" / "migrations" / "0099_profile_change_policy.sql"
    ).read_text(encoding="utf-8")

    assert "profile_change_policy_version" in migration


def test_old_league_cogs_are_archived_and_not_loaded() -> None:
    main = (ROOT / "main.py").read_text(encoding="utf-8")
    assert (ROOT / "legacy" / "league.py").exists()
    assert (ROOT / "legacy" / "seasonal_league.py").exists()
    assert not (ROOT / "cogs" / "league.py").exists()
    assert not (ROOT / "cogs" / "seasonal_league.py").exists()
    assert "SheetService" not in main
    assert "./cogs" in main
    assert "./legacy" not in main
