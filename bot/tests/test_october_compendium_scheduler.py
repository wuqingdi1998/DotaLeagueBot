from pathlib import Path


SOURCE = (
    Path(__file__).parents[1] / "cogs" / "october_compendium_scheduler.py"
).read_text(encoding="utf-8")


def test_october_clan_formation_starts_at_exact_moscow_time() -> None:
    assert "ZoneInfo(\"Europe/Moscow\")" in SOURCE
    assert "hour=23, minute=50" in SOURCE
    assert "2026,\n    10,\n    4,\n    23,\n    50" in SOURCE
    assert '"/api/internal/compendium-october/form-clans"' in SOURCE


def test_october_clan_formation_retries_until_after_publication() -> None:
    assert "@tasks.loop(seconds=30)" in SOURCE
    assert "FORMATION_RETRY_END" in SOURCE
    assert "timeout_seconds=600" in SOURCE
