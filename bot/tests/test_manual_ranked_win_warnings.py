from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0131_manual_ranked_win_warnings.sql"
).read_text(encoding="utf-8")
BRIDGE = (ROOT / "bot" / "cogs" / "website_bridge.py").read_text(
    encoding="utf-8"
)
DEPLOYMENT = (ROOT / ".github" / "workflows" / "deploy.yml").read_text(
    encoding="utf-8"
)
CI = (ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")


def test_automatic_ranked_win_reminders_are_disabled() -> None:
    assert "DELETE FROM season_ranked_win_reminder_settings" in MIGRATION
    assert "DELETE FROM season_ranked_win_reminder_catch_ups" in MIGRATION
    assert "season_ranked_wins_registration_reminder" in MIGRATION
    assert "season_ranked_wins_48_hour_reminder" in MIGRATION
    assert "season_ranked_wins_first_round_catch_up" in MIGRATION
    assert "queue_due_ranked_win_reminders" not in BRIDGE
    assert not (ROOT / "bot" / "services" / "season_ranked_win_reminders.py").exists()


def test_deployment_stops_the_old_bot_before_disabling_pending_reminders() -> None:
    stop_position = DEPLOYMENT.index("docker compose stop bot")
    migrate_position = DEPLOYMENT.index("docker compose run --rm migrate")
    assert stop_position < migrate_position
    assert "services/season_ranked_win_reminders.py" not in DEPLOYMENT
    assert "services/season_ranked_win_reminders.py" not in CI
