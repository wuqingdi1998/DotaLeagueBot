from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0001_web_platform.sql"
).read_text(encoding="utf-8")


def test_web_sessions_are_linked_to_registered_players() -> None:
    assert "web_sessions" in MIGRATION
    assert "REFERENCES players(discord_id)" in MIGRATION


def test_team_members_have_one_role_per_application() -> None:
    assert "UNIQUE (application_id, role)" in MIGRATION


def test_players_cannot_duplicate_in_one_application() -> None:
    assert "PRIMARY KEY (application_id, player_id)" in MIGRATION


def test_team_names_are_unique_inside_tournament() -> None:
    assert "UNIQUE (tournament_id, team_name)" in MIGRATION


def test_checkin_is_idempotent() -> None:
    assert "PRIMARY KEY (match_id, application_id)" in MIGRATION


def test_notification_outbox_supports_retries() -> None:
    assert "notification_outbox" in MIGRATION
    assert "attempts SMALLINT" in MIGRATION
