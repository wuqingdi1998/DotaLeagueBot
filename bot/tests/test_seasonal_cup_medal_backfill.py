from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0110_backfill_seasonal_cup_medals.sql"
).read_text(encoding="utf-8")


def test_completed_seasonal_cups_award_all_three_medal_types() -> None:
    assert "INSERT INTO player_medals" in MIGRATION
    assert "tournament.tournament_type = 'seasonal_cup'" in MIGRATION
    assert "tournament.end_at < NOW()" in MIGRATION
    assert "result.placement BETWEEN 1 AND 3" in MIGRATION
    assert "WHEN 1 THEN 'gold'::text" in MIGRATION
    assert "WHEN 2 THEN 'silver'::text" in MIGRATION
    assert "ELSE 'bronze'::text" in MIGRATION


def test_seasonal_cup_medals_exclude_coaches_and_are_idempotent() -> None:
    assert "roster.role <> 'coach'" in MIGRATION
    assert "NOT EXISTS" in MIGRATION
    assert "existing.player_id = roster.player_id" in MIGRATION
    assert "existing.tournament_id = tournament.id" in MIGRATION
    assert "existing.medal_type = CASE result.placement" in MIGRATION
