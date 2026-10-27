import importlib.util
from pathlib import Path
import sys


SCRIPT = Path(__file__).resolve().parents[2] / "scripts/prepare-development-env.py"
SPEC = importlib.util.spec_from_file_location("development_environment", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_development_excludes_production_credentials_and_has_its_own_database():
    production = {
        "PUBLIC_BASE_URL": "https://lsesports.ru",
        "POSTGRES_DB": "live",
        "POSTGRES_PASSWORD": "live-database-secret",
        "DATABASE_URL": "postgres://live:secret@db/live",
        "DISCORD_TOKEN": "live-bot-token",
        "DISCORD_CLIENT_SECRET": "oauth-secret",
        "COMPENDIUM_SCHEDULER_SECRET": "live-scheduler",
        "ORGANIZER_PASSWORD": "organizer-password",
    }
    result = MODULE.development_environment(production, {}, "release-sha")
    assert result["POSTGRES_DB"] == "linkens_development"
    assert result["POSTGRES_PASSWORD"] != production["POSTGRES_PASSWORD"]
    assert result["COMPENDIUM_SCHEDULER_SECRET"] != production["COMPENDIUM_SCHEDULER_SECRET"]
    assert not {"DATABASE_URL", "DISCORD_TOKEN", "DISCORD_CLIENT_SECRET"} & result.keys()
    assert result["WEBSITE_NOTIFICATIONS_ENABLED"] == "false"
    assert result["PUBLIC_BASE_URL"] == "https://dev.lsesports.ru"
    assert result["PRODUCTION_BASE_URL"] == "https://lsesports.ru"
    assert result["ORGANIZER_PASSWORD"] == "organizer-password"


def test_updates_keep_existing_development_database_and_internal_secrets():
    previous = {"POSTGRES_PASSWORD": "dev-password", "COMPENDIUM_SCHEDULER_SECRET": "dev-scheduler"}
    result = MODULE.development_environment({"PUBLIC_BASE_URL": "https://lsesports.ru"}, previous, "next-release")
    assert result["POSTGRES_PASSWORD"] == "dev-password"
    assert result["COMPENDIUM_SCHEDULER_SECRET"] == "dev-scheduler"
    assert result["SITE_RELEASE_SHA"] == "next-release"


def test_configuration_command_writes_only_isolated_settings(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(sys, "argv", [str(SCRIPT), "--production-dir", str(tmp_path), "--revision", "checked-release"])
    monkeypatch.setattr(MODULE, "compose_environment", lambda *_: {
        "PUBLIC_BASE_URL": "https://lsesports.ru",
        "POSTGRES_PASSWORD": "never-copy-live-password",
        "DISCORD_TOKEN": "never-copy-live-bot-token",
        "ORGANIZER_PASSWORD": "example-with-'quote-and-$dollar",
    })
    MODULE.main()
    saved = (tmp_path / ".env.development").read_text(encoding="utf-8")
    assert "never-copy" not in saved
    assert "SITE_RELEASE_SHA='checked-release'" in saved
    assert "SITE_ENVIRONMENT='development'" in saved
    assert "example-with-\\'quote-and-$dollar" in saved
