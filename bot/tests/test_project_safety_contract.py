from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_production_cogs_do_not_register_debug_fill_commands() -> None:
    production_cogs = (
        PROJECT_ROOT / "bot" / "cogs" / "league.py",
        PROJECT_ROOT / "bot" / "cogs" / "seasonal_league.py",
    )

    for cog_path in production_cogs:
        source = cog_path.read_text(encoding="utf-8")
        assert 'command(name="debug_fill"' not in source, cog_path


def test_check_script_stops_after_each_failed_native_command() -> None:
    script = (PROJECT_ROOT / "scripts" / "check.ps1").read_text(encoding="utf-8")

    assert "function Invoke-CheckedCommand" in script
    assert "if ($LASTEXITCODE -ne 0)" in script
    assert script.count("Invoke-CheckedCommand") >= 11
    assert "docker compose config --quiet --no-env-resolution" in script
