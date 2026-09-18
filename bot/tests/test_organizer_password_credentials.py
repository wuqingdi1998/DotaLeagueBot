from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0144_permanent_organizer_passwords.sql"
).read_text(encoding="utf-8")


def test_permanent_organizer_password_is_stored_as_a_slow_hash() -> None:
    assert "CREATE TABLE IF NOT EXISTS organizer_passwords" in MIGRATION
    assert "password_hash VARCHAR(256) NOT NULL UNIQUE" in MIGRATION
    assert "'scrypt$" in MIGRATION


def test_permanent_organizer_password_can_be_revoked() -> None:
    assert "is_active BOOLEAN NOT NULL DEFAULT TRUE" in MIGRATION
