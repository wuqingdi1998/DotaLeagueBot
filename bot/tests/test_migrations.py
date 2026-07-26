from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0001_web_platform.sql"
).read_text(encoding="utf-8")

ORGANIZER_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0002_organizer_sessions.sql"
).read_text(encoding="utf-8")

ARCHIVE_DETAILS_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0004_tournament_archive_details.sql"
).read_text(encoding="utf-8")

FASTCUP_SEED_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0005_cd_fastcup_5.sql"
).read_text(encoding="utf-8")

FASTCUP_DATE_FIX_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0006_fastcup_end_date.sql"
).read_text(encoding="utf-8")

PROFILE_AND_BRACKET_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0007_profile_roles_and_bracket_links.sql"
).read_text(encoding="utf-8")

BRACKET_LAYOUT_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0008_bracket_grid_layout.sql"
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


def test_organizer_sessions_are_separate_from_player_sessions() -> None:
    assert "web_organizer_sessions" in ORGANIZER_MIGRATION
    assert "REFERENCES players(discord_id)" in ORGANIZER_MIGRATION
    assert "web_organizer_login_attempts" in ORGANIZER_MIGRATION


def test_archive_rosters_freeze_player_data_per_tournament() -> None:
    assert "tournament_roster_snapshots" in ARCHIVE_DETAILS_MIGRATION
    assert "nickname_snapshot" in ARCHIVE_DETAILS_MIGRATION
    assert "tier_snapshot" in ARCHIVE_DETAILS_MIGRATION
    assert "player_id BIGINT REFERENCES players(discord_id) ON DELETE SET NULL" in (
        ARCHIVE_DETAILS_MIGRATION
    )


def test_technical_match_results_keep_labels_and_decision() -> None:
    assert "result_type" in ARCHIVE_DETAILS_MIGRATION
    assert "team_a_result_label" in ARCHIVE_DETAILS_MIGRATION
    assert "team_b_result_label" in ARCHIVE_DETAILS_MIGRATION
    assert "decision_note" in ARCHIVE_DETAILS_MIGRATION


def test_fastcup_archive_contains_complete_source_sections() -> None:
    assert "'cd-fastcup-5'" in FASTCUP_SEED_MIGRATION
    assert "tournament_rules" in FASTCUP_SEED_MIGRATION
    assert "tournament_prizes" in FASTCUP_SEED_MIGRATION
    assert "tournament_roster_snapshots" in FASTCUP_SEED_MIGRATION
    assert "'technical', 'tl', 'tw'" in FASTCUP_SEED_MIGRATION
    assert "greencats сняты с турнира" in FASTCUP_SEED_MIGRATION


def test_fastcup_archive_has_all_teams_players_and_matches() -> None:
    assert FASTCUP_SEED_MIGRATION.count("'approved', 'Регистрация'") == 6
    assert FASTCUP_SEED_MIGRATION.count("'approved', 'Приглашение'") == 2
    assert FASTCUP_SEED_MIGRATION.count("::timestamptz, '") == 16
    assert FASTCUP_SEED_MIGRATION.count("tournament_id_value, ") >= 16


def test_fastcup_archive_ends_on_source_second_day() -> None:
    assert "'2026-05-24 23:59:00+03'" in FASTCUP_DATE_FIX_MIGRATION
    assert "WHERE slug = 'cd-fastcup-5'" in FASTCUP_DATE_FIX_MIGRATION


def test_profile_roles_and_backgrounds_are_persistent() -> None:
    assert "player_discord_roles" in PROFILE_AND_BRACKET_MIGRATION
    assert "player_profile_preferences" in PROFILE_AND_BRACKET_MIGRATION
    assert "'damage'" in PROFILE_AND_BRACKET_MIGRATION
    assert "'water'" not in PROFILE_AND_BRACKET_MIGRATION


def test_bracket_matches_can_link_winners_and_losers() -> None:
    assert "winner_to_match_id" in PROFILE_AND_BRACKET_MIGRATION
    assert "winner_to_slot" in PROFILE_AND_BRACKET_MIGRATION
    assert "loser_to_match_id" in PROFILE_AND_BRACKET_MIGRATION
    assert "loser_to_slot" in PROFILE_AND_BRACKET_MIGRATION


def test_bracket_layout_uses_persistent_bounded_grid_coordinates() -> None:
    assert "bracket_grid_column SMALLINT" in BRACKET_LAYOUT_MIGRATION
    assert "bracket_grid_row SMALLINT" in BRACKET_LAYOUT_MIGRATION
    assert "BETWEEN 0 AND 100" in BRACKET_LAYOUT_MIGRATION
    assert "tournament.slug = 'cd-fastcup-5'" in BRACKET_LAYOUT_MIGRATION
