from pathlib import Path


ROOT = Path(__file__).parents[1]


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_bot_accepts_manual_tiers_up_to_twelve() -> None:
    for path in (
        "cogs/profile.py",
        "cogs/league.py",
        "cogs/seasonal_league.py",
    ):
        contents = source(path)
        assert "0 <= val <= 12" in contents
        assert "от 0 до 12" in contents


def test_archived_players_are_excluded_from_active_league_queries() -> None:
    for path in (
        "services/league_service.py",
        "services/seasonal_league_service.py",
    ):
        contents = source(path)
        assert "Player.is_archived.is_(False)" in contents


def test_all_bot_tier_editors_restore_current_status() -> None:
    profile = source("cogs/profile.py")
    assert "set_player_tier(player, val)" in profile

    for path in (
        "services/league_service.py",
        "services/seasonal_league_service.py",
    ):
        contents = source(path)
        assert "update_player_tier" in contents


def test_team_creation_uses_one_effective_tier_scale() -> None:
    for path in ("cogs/league.py", "cogs/seasonal_league.py"):
        contents = source(path)
        assert "effective_player_tier" in contents
        assert "x.internal_rating if x.internal_rating else (x.rank_tier or 0)" not in contents


def test_sonic_is_reactivated_after_his_saved_manual_tier() -> None:
    migration = source("database/migrations/0052_reactivate_sonic_tier.sql")
    assert "LOWER(ingame_name) = 'son1c'" in migration
    assert "tier_status = 'current'" in migration
