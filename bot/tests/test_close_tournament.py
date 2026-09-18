from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def source(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_close_announcement_creates_and_keeps_tournament_in_sync() -> None:
    close_cog = source("bot/cogs/close.py")
    migration = source("bot/database/migrations/0142_close_tournaments.sql")

    assert "await ensure_close_tournament(session, ev.id)" in close_cog
    assert close_cog.count(
        "await sync_close_tournament_participants(session, ev.id)"
    ) == 2
    assert "ADD COLUMN IF NOT EXISTS tournament_id" in migration
    assert "CREATE OR REPLACE FUNCTION ensure_close_tournament" in migration
    assert "CREATE OR REPLACE FUNCTION sync_close_tournament_participants" in migration
    assert "'close-' || event.message_id" in migration
    assert "'seasonal', 1" in migration


def test_close_formats_have_full_names_and_another_mode() -> None:
    format_migration = source(
        "bot/database/migrations/0143_close_tournament_format_names.sql"
    )
    service = source("bot/services/close_tournament.py")

    assert "'Captain''s Mode'" in format_migration
    assert "'Captain''s Draft'" in format_migration
    assert "'Single Draft'" in format_migration
    assert "'Другой режим'" in format_migration
    assert "canonical_close_game_format(game_format)" in service


def test_close_start_dm_uses_current_participants_and_tournament_link() -> None:
    bridge = source("bot/cogs/website_bridge.py")

    assert "_queue_close_start_notifications" in bridge
    assert "'close_started'" in bridge
    assert "event.participant_ids" in bridge
    assert "'/tournaments/' || tournament.slug" in bridge
    assert "ON CONFLICT (discord_id, close_event_id, event_type)" in bridge
    assert "WHERE close_event.tournament_id = tournament.id" in bridge


def test_close_round_does_not_create_season_discord_channel() -> None:
    channel_sync = source("bot/services/season_round_channel_sync.py")

    assert "SELECT 1 FROM close_events close_event" in channel_sync
    assert "close_event.tournament_id = round.tournament_id" in channel_sync
