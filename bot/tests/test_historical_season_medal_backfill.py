from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0036_backfill_historical_season_medals.sql"
).read_text(encoding="utf-8")


def test_historical_season_finalists_are_added_to_profile_medals() -> None:
    assert "INSERT INTO player_medals" in MIGRATION
    assert "FROM season_finalists AS finalist" in MIGRATION
    assert "finalist.medal IN ('gold', 'silver')" in MIGRATION
    assert "finalist.player_id" in MIGRATION
    assert "finalist.tournament_id" in MIGRATION
    assert "finalist.medal" in MIGRATION


def test_historical_season_medal_backfill_is_idempotent() -> None:
    assert "NOT EXISTS" in MIGRATION
    assert "existing.player_id = finalist.player_id" in MIGRATION
    assert "existing.tournament_id = finalist.tournament_id" in MIGRATION
    assert "existing.medal_type = finalist.medal" in MIGRATION
