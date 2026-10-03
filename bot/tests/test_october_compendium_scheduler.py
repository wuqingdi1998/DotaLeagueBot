from pathlib import Path


SOURCE = (
    Path(__file__).parents[1] / "cogs" / "october_compendium_scheduler.py"
).read_text(encoding="utf-8")


def test_october_clan_report_starts_at_exact_moscow_time() -> None:
    assert "ZoneInfo(\"Europe/Moscow\")" in SOURCE
    assert "2026,\n    10,\n    4,\n    23,\n    30" in SOURCE
    assert '"/api/internal/compendium-october/prepare-launch"' in SOURCE


def test_october_clan_publication_waits_for_approval_at_midnight() -> None:
    assert "@tasks.loop(seconds=30)" in SOURCE
    assert "PUBLICATION_START" in SOURCE
    assert "PUBLICATION_RETRY_END" in SOURCE
    assert '"/api/internal/compendium-october/publish-launch"' in SOURCE
    assert "timeout_seconds=600" in SOURCE
