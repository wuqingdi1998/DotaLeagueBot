from pathlib import Path


ROOT = Path(__file__).parents[1]


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_archiving_releases_dota_id_without_deleting_history() -> None:
    migration = source("database/migrations/0060_returning_player_registration.sql")

    assert "archived_steam_id32 BIGINT" in migration
    assert "CREATE SEQUENCE IF NOT EXISTS archived_player_steam_id_seq" in migration
    assert "archived_steam_id32 = steam_id32" in migration
    assert "nextval('archived_player_steam_id_seq')" in migration


def test_archived_discord_account_can_register_again() -> None:
    registration = source("services/player_registration.py")
    profile = source("cogs/profile.py")

    assert "register_or_reactivate_player" in profile
    assert "existing_player.is_archived" in registration
    assert "existing_player.is_archived = False" in registration
    assert 'existing_player.tier_status = "current"' in registration
    assert "existing_player.team_id = None" in registration
    assert "registered_player_id = :player_id" in registration
    assert "existing_player.archived_steam_id32 = None" in registration


def test_linked_archive_requires_organizer_review_before_reactivation() -> None:
    registration = source("services/player_registration.py")

    assert "archive_is_linked" in registration
    assert "Архив уже привязан к другому действующему профилю" in registration
