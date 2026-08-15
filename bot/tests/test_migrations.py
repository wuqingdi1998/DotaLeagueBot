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

INVITATION_CLEANUP_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0067_tournament_invitation_cleanup.sql"
).read_text(encoding="utf-8")

FEARLESS_DRAFT_PREVIEW_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0068_fearless_draft_preview.sql"
).read_text(encoding="utf-8")

TOURNAMENT_TEAM_CHECKIN_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0071_tournament_team_checkins.sql"
).read_text(encoding="utf-8")

LSERUMSH_CHECKIN_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0072_lserumsh_checkin_hour.sql"
).read_text(encoding="utf-8")

BRACKET_LAYOUT_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0008_bracket_grid_layout.sql"
).read_text(encoding="utf-8")

BRACKET_ELIMINATIONS_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0009_bracket_eliminations.sql"
).read_text(encoding="utf-8")

GROUP_SETTINGS_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0010_group_advancement_settings.sql"
).read_text(encoding="utf-8")

CUSTOM_PROFILE_BACKGROUNDS_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0012_custom_profile_backgrounds.sql"
).read_text(encoding="utf-8")

MOBILE_PROFILE_BACKGROUNDS_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0013_mobile_profile_backgrounds.sql"
).read_text(encoding="utf-8")

CLOSE_REGISTRATION_TIMES_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0014_close_registration_times.sql"
).read_text(encoding="utf-8")

TOURNAMENT_SCHEDULE_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0015_tournament_schedule.sql"
).read_text(encoding="utf-8")

SEASON_QUICK_FACTS_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0026_season_quick_facts.sql"
).read_text(encoding="utf-8")

FASTCUP_ARCHIVE_SERIES_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0016_cd_fastcup_archive_series.sql"
).read_text(encoding="utf-8")

FASTCUP_HISTORICAL_PLAYER_LINKS_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0017_fastcup_historical_player_links.sql"
).read_text(encoding="utf-8")

FASTCUP_4_TITLE_MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0018_fastcup_4_title.sql"
).read_text(encoding="utf-8")

PLAYOFF_ELIMINATIONS_BACKFILL = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0011_backfill_playoff_eliminations.sql"
).read_text(encoding="utf-8")


def test_web_sessions_are_linked_to_registered_players() -> None:
    assert "web_sessions" in MIGRATION
    assert "REFERENCES players(discord_id)" in MIGRATION


def test_tournament_schedule_has_days_entries_and_fastcup_seed() -> None:
    assert "tournament_schedule_days" in TOURNAMENT_SCHEDULE_MIGRATION
    assert "tournament_schedule_entries" in TOURNAMENT_SCHEDULE_MIGRATION
    assert "ON DELETE CASCADE" in TOURNAMENT_SCHEDULE_MIGRATION
    assert "cd-fastcup-5" in TOURNAMENT_SCHEDULE_MIGRATION
    assert "Гранд-финал" in TOURNAMENT_SCHEDULE_MIGRATION


def test_season_quick_facts_are_ordered_and_bounded() -> None:
    assert "tournament_season_facts" in SEASON_QUICK_FACTS_MIGRATION
    assert "sort_order BETWEEN 1 AND 9" in SEASON_QUICK_FACTS_MIGRATION
    assert "UNIQUE (tournament_id, sort_order)" in SEASON_QUICK_FACTS_MIGRATION
    assert "Всего туров в сезоне" in SEASON_QUICK_FACTS_MIGRATION


def test_fastcup_archive_series_has_complete_tournament_sections() -> None:
    for number in (1, 2, 3, 4, 6):
        assert f"'cd-fastcup-{number}'" in FASTCUP_ARCHIVE_SERIES_MIGRATION
    assert FASTCUP_ARCHIVE_SERIES_MIGRATION.count(
        "INSERT INTO fastcup_matches VALUES"
    ) == 1
    assert FASTCUP_ARCHIVE_SERIES_MIGRATION.count(
        "INSERT INTO fastcup_rosters VALUES"
    ) == 1
    assert "tournament_schedule_entries" in FASTCUP_ARCHIVE_SERIES_MIGRATION
    assert "winner_to_match_id" in FASTCUP_ARCHIVE_SERIES_MIGRATION
    assert "tier_snapshot" in FASTCUP_ARCHIVE_SERIES_MIGRATION


def test_fastcup_historical_nicknames_link_without_being_rewritten() -> None:
    aliases = {
        "4ubrik": "zhelezo",
        "bananza": "zhelezo",
        "Raven": "Ame''s Bastard",
        "Wasd": "Yozhik",
        "iFlopz!": "Sanraizu",
        "serenity": "slither.io",
        "zvёzдочка": "slither.io",
        "GOLDEN POPI": "GOLDEN PAPI",
        "cusdvaqe": "confuse",
        ".flowers": ".flowerZ",
    }
    for historical_nickname, current_nickname in aliases.items():
        assert (
            f"('{historical_nickname}', '{current_nickname}')"
            in FASTCUP_HISTORICAL_PLAYER_LINKS_MIGRATION
        )
    assert "SET player_id =" in FASTCUP_HISTORICAL_PLAYER_LINKS_MIGRATION
    assert "SET nickname_snapshot" not in FASTCUP_HISTORICAL_PLAYER_LINKS_MIGRATION


def test_fastcup_4_title_drops_legacy_ls_prefix() -> None:
    assert "SET name = 'CD Fastcup #4'" in FASTCUP_4_TITLE_MIGRATION
    assert "headline = 'CD Fastcup #4'" in FASTCUP_4_TITLE_MIGRATION
    assert "WHERE slug = 'cd-fastcup-4'" in FASTCUP_4_TITLE_MIGRATION


def test_team_members_have_one_role_per_application() -> None:
    assert "UNIQUE (application_id, role)" in MIGRATION


def test_players_cannot_duplicate_in_one_application() -> None:
    assert "PRIMARY KEY (application_id, player_id)" in MIGRATION


def test_team_names_are_unique_inside_tournament() -> None:
    assert "UNIQUE (tournament_id, team_name)" in MIGRATION


def test_checkin_is_idempotent() -> None:
    assert "PRIMARY KEY (match_id, application_id)" in MIGRATION


def test_tournament_checkin_replaces_match_checkin_without_losing_confirmations() -> None:
    assert "tournament_team_checkins" in TOURNAMENT_TEAM_CHECKIN_MIGRATION
    assert "PRIMARY KEY (tournament_id, application_id)" in (
        TOURNAMENT_TEAM_CHECKIN_MIGRATION
    )
    assert "FROM tournament_match_checkins" in TOURNAMENT_TEAM_CHECKIN_MIGRATION
    assert "tournament_check_in" in TOURNAMENT_TEAM_CHECKIN_MIGRATION


def test_lserumsh_checkin_opens_one_hour_before_first_match() -> None:
    assert "check_in_minutes = 60" in LSERUMSH_CHECKIN_MIGRATION
    assert "slug = 'lserumsh'" in LSERUMSH_CHECKIN_MIGRATION


def test_notification_outbox_supports_retries() -> None:
    assert "notification_outbox" in MIGRATION
    assert "attempts SMALLINT" in MIGRATION


def test_invitation_cleanup_tracks_and_deletes_discord_messages() -> None:
    assert "application_id BIGINT" in INVITATION_CLEANUP_MIGRATION
    assert "discord_message_id BIGINT" in INVITATION_CLEANUP_MIGRATION
    assert "delete_pending" in INVITATION_CLEANUP_MIGRATION
    assert "ON DELETE SET NULL" in INVITATION_CLEANUP_MIGRATION
    assert "invitation_candidates" in INVITATION_CLEANUP_MIGRATION


def test_fearless_draft_preview_is_shared_between_players() -> None:
    assert "ALTER TABLE draft_maps" in FEARLESS_DRAFT_PREVIEW_MIGRATION
    assert "preview_hero_id INTEGER" in FEARLESS_DRAFT_PREVIEW_MIGRATION


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


def test_custom_profile_background_key_is_persistent() -> None:
    assert "custom_background_key VARCHAR(96)" in (
        CUSTOM_PROFILE_BACKGROUNDS_MIGRATION
    )


def test_mobile_profile_background_key_is_persistent() -> None:
    assert "custom_background_mobile_key VARCHAR(96)" in (
        MOBILE_PROFILE_BACKGROUNDS_MIGRATION
    )


def test_close_registration_times_are_persistent() -> None:
    assert "participant_joined_at TEXT NOT NULL" in (
        CLOSE_REGISTRATION_TIMES_MIGRATION
    )


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


def test_bracket_elimination_references_a_registered_team() -> None:
    assert "eliminated_team_application_id BIGINT" in BRACKET_ELIMINATIONS_MIGRATION
    assert "REFERENCES tournament_team_applications(id)" in (
        BRACKET_ELIMINATIONS_MIGRATION
    )
    assert "ON DELETE SET NULL" in BRACKET_ELIMINATIONS_MIGRATION


def test_group_advancement_and_notes_are_persistent() -> None:
    assert "playoff_type" in GROUP_SETTINGS_MIGRATION
    assert "'single_elimination', 'double_elimination'" in GROUP_SETTINGS_MIGRATION
    assert "explanation TEXT" in GROUP_SETTINGS_MIGRATION
    assert "team_capacity BETWEEN 3 AND 8" in GROUP_SETTINGS_MIGRATION
    assert "advance_to_playoff" in GROUP_SETTINGS_MIGRATION
    assert "advance_to_upper" in GROUP_SETTINGS_MIGRATION
    assert "advance_to_lower" in GROUP_SETTINGS_MIGRATION
    assert "Итоговое распределение команд" in GROUP_SETTINGS_MIGRATION


def test_finished_lower_bracket_losses_are_backfilled_as_eliminations() -> None:
    assert "eliminated_team_application_id" in PLAYOFF_ELIMINATIONS_BACKFILL
    assert "bracket_side IN ('lower', 'grand_final')" in (
        PLAYOFF_ELIMINATIONS_BACKFILL
    )
    assert "loser_to_match_id IS NULL" in PLAYOFF_ELIMINATIONS_BACKFILL
