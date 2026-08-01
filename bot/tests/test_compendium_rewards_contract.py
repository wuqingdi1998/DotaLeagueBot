from pathlib import Path


ROOT = Path(__file__).parents[1]
SCHEDULER = (ROOT / "cogs" / "compendium_scheduler.py").read_text(encoding="utf-8")
MIGRATION = (
    ROOT / "database" / "migrations" / "0042_compendium_rewards.sql"
).read_text(encoding="utf-8")


def test_gold_compendium_role_is_earned_and_expires_at_season_nine() -> None:
    assert 'COMPENDIUM_GOLD_ROLE_STARS = 75' in SCHEDULER
    assert 'AUTUMN_SEASON_NUMBER = 9' in SCHEDULER
    assert 'SUM(reward_amount) >= :required_stars' in SCHEDULER
    assert 'season_number >= :season_number' in SCHEDULER
    assert 'sync_gold_compendium_role' in SCHEDULER


def test_reward_migration_allows_four_quests_and_six_hero_cards() -> None:
    assert 'CHECK (position BETWEEN 1 AND 4)' in MIGRATION
    assert MIGRATION.count('CHECK (position BETWEEN 1 AND 6)') == 2
    assert 'DROP CONSTRAINT IF EXISTS' in MIGRATION
