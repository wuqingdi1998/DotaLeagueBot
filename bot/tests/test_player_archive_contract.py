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
