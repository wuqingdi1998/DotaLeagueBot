from pathlib import Path


ROOT = Path(__file__).parents[1]
SCHEDULER = (ROOT / "cogs" / "compendium_scheduler.py").read_text(encoding="utf-8")
MIGRATION = (
    ROOT / "database" / "migrations" / "0042_compendium_rewards.sql"
).read_text(encoding="utf-8")
ADMIN_MIGRATION = (
    ROOT / "database" / "migrations" / "0043_compendium_admin_stars.sql"
).read_text(encoding="utf-8")
PROFILE_BADGES_MIGRATION = (
    ROOT / "database" / "migrations" / "0044_persistent_profile_badges.sql"
).read_text(encoding="utf-8")
STAR_RESET_MIGRATION = (
    ROOT / "database" / "migrations" / "0046_reset_compendium_stars.sql"
).read_text(encoding="utf-8")
SHORTENED_GOALS_MIGRATION = (
    ROOT / "database" / "migrations" / "0047_shorten_compendium_goals.sql"
).read_text(encoding="utf-8")
FROKENG_BADGE_CORRECTION_MIGRATION = (
    ROOT
    / "database"
    / "migrations"
    / "0084_recalculate_frokeng_profile_badge.sql"
).read_text(encoding="utf-8")
ADMIN_COG = (ROOT / "cogs" / "compendium_admin.py").read_text(encoding="utf-8")
ADMIN_SERVICE = (
    ROOT / "services" / "compendium_star_service.py"
).read_text(encoding="utf-8")


def test_gold_compendium_role_is_earned_and_expires_at_season_nine() -> None:
    assert 'COMPENDIUM_GOLD_ROLE_STARS = 60' in SCHEDULER
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
    assert 'name="compendium"' in ADMIN_COG
    assert 'name="completestars"' in ADMIN_COG
    assert ADMIN_COG.count("has_permissions(administrator=True)") == 4
    assert "@app_commands.guild_only()" in ADMIN_COG
    assert "compendium_admin_star_adjustments" in ADMIN_SERVICE
    assert "pg_advisory_xact_lock" in ADMIN_SERVICE
    assert "Недостаточно звёзд" in ADMIN_SERVICE


def test_completestars_response_is_public() -> None:
    command = ADMIN_COG.split('name="completestars"', 1)[1]
    command = command.split("async def setup", 1)[0]

    assert "defer(ephemeral=False)" in command
    assert command.count("ephemeral=False") == 3
    assert "ephemeral=True" not in command


def test_admin_adjustments_feed_the_shared_star_total() -> None:
    assert "CREATE VIEW compendium_player_star_totals" in ADMIN_MIGRATION
    assert "COALESCE(completion.total, 0) + COALESCE(adjustment.total, 0)" in ADMIN_MIGRATION
    assert "amount <> 0" in ADMIN_MIGRATION


def test_compendium_badges_are_permanent_profile_customizations() -> None:
    assert "player_profile_badges" in PROFILE_BADGES_MIGRATION
    assert "PRIMARY KEY (player_id, badge_key)" in PROFILE_BADGES_MIGRATION
    assert "grant_ti_2026_profile_badges" in PROFILE_BADGES_MIGRATION
    assert "compendium_completion_profile_badges_trigger" in PROFILE_BADGES_MIGRATION
    assert "compendium_adjustment_profile_badges_trigger" in PROFILE_BADGES_MIGRATION
    assert "ON CONFLICT (player_id, badge_key) DO NOTHING" in PROFILE_BADGES_MIGRATION
    assert "MAX(running_stars)" in PROFILE_BADGES_MIGRATION


def test_star_reset_clears_all_sources_but_keeps_permanent_badges() -> None:
    assert "DELETE FROM compendium_user_quest_completions" in STAR_RESET_MIGRATION
    assert "DELETE FROM compendium_admin_star_adjustments" in STAR_RESET_MIGRATION
    assert "DELETE FROM compendium_prediction_rewards" in STAR_RESET_MIGRATION
    assert "player_profile_badges" not in STAR_RESET_MIGRATION


def test_shortened_badge_goals_are_persistent_and_backfilled() -> None:
    assert "('ti-2026-bronze'::varchar, 10)" in SHORTENED_GOALS_MIGRATION
    assert "('ti-2026-silver'::varchar, 30)" in SHORTENED_GOALS_MIGRATION
    assert "('ti-2026-gold'::varchar, 60)" in SHORTENED_GOALS_MIGRATION
    assert "grant_ti_2026_profile_badges(discord_id)" in SHORTENED_GOALS_MIGRATION


def test_frokeng_badge_is_recalculated_from_his_current_star_total() -> None:
    assert "steam_id32 = 301109815" in FROKENG_BADGE_CORRECTION_MIGRATION
    assert "DELETE FROM player_profile_badges" in FROKENG_BADGE_CORRECTION_MIGRATION
    assert (
        "PERFORM grant_ti_2026_profile_badges(target_player_id)"
        in FROKENG_BADGE_CORRECTION_MIGRATION
    )
    assert "INSERT INTO player_profile_badges" not in FROKENG_BADGE_CORRECTION_MIGRATION
