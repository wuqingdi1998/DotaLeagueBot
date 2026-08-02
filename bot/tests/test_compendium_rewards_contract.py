from pathlib import Path


ROOT = Path(__file__).parents[1]
SCHEDULER = (ROOT / "cogs" / "compendium_scheduler.py").read_text(encoding="utf-8")
MIGRATION = (
    ROOT / "database" / "migrations" / "0042_compendium_rewards.sql"
).read_text(encoding="utf-8")
ADMIN_MIGRATION = (
    ROOT / "database" / "migrations" / "0043_compendium_admin_stars.sql"
).read_text(encoding="utf-8")
ADMIN_COG = (ROOT / "cogs" / "compendium_admin.py").read_text(encoding="utf-8")
ADMIN_SERVICE = (
    ROOT / "services" / "compendium_star_service.py"
).read_text(encoding="utf-8")


def test_gold_compendium_role_is_earned_and_expires_at_season_nine() -> None:
    assert 'COMPENDIUM_GOLD_ROLE_STARS = 75' in SCHEDULER
    assert 'AUTUMN_SEASON_NUMBER = 9' in SCHEDULER
    assert 'total_stars >= :required_stars' in SCHEDULER
    assert 'season_number >= :season_number' in SCHEDULER
    assert 'sync_gold_compendium_role' in SCHEDULER


def test_reward_migration_allows_four_quests_and_six_hero_cards() -> None:
    assert 'CHECK (position BETWEEN 1 AND 4)' in MIGRATION
    assert MIGRATION.count('CHECK (position BETWEEN 1 AND 6)') == 2
    assert 'DROP CONSTRAINT IF EXISTS' in MIGRATION


def test_admin_star_commands_are_restricted_and_persistent() -> None:
    assert 'name="add_stars"' in ADMIN_COG
    assert 'name="delete_stars"' in ADMIN_COG
    assert ADMIN_COG.count("has_permissions(administrator=True)") == 2
    assert "compendium_admin_star_adjustments" in ADMIN_SERVICE
    assert "pg_advisory_xact_lock" in ADMIN_SERVICE
    assert "Недостаточно звёзд" in ADMIN_SERVICE


def test_admin_adjustments_feed_the_shared_star_total() -> None:
    assert "CREATE VIEW compendium_player_star_totals" in ADMIN_MIGRATION
    assert "COALESCE(completion.total, 0) + COALESCE(adjustment.total, 0)" in ADMIN_MIGRATION
    assert "amount <> 0" in ADMIN_MIGRATION
