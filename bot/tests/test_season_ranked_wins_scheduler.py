from pathlib import Path


ROOT = Path(__file__).parents[1]


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_ranked_wins_are_refreshed_every_ten_minutes() -> None:
    scheduler = source("cogs/season_ranked_wins_scheduler.py")
    assert "@tasks.loop(minutes=10)" in scheduler
    assert '"/api/internal/season/ranked-wins"' in scheduler
    assert "timeout_seconds=300" in scheduler


def test_new_season_uses_four_secondary_role_wins() -> None:
    activity = source("services/stratz_service.py")
    assert 'ACTIVITY_SIDE_REQUIRED", "4"' in activity
