DO $migration$
DECLARE
    missing_profiles TEXT;
BEGIN
    CREATE TEMP TABLE season8_player_aliases ON COMMIT DROP AS
    SELECT *
    FROM (
        VALUES
            (-8000000000008001::BIGINT, 203058168408965120::BIGINT, 'Yasama', 'Sanraizu'),
            (-8000000000008002::BIGINT, 311248021415264276::BIGINT, 'gogogo', 'LEGSDAY'),
            (-8000000000008003::BIGINT, 379999009646968832::BIGINT, 'iloveiran', 'zhelezo')
    ) AS alias(
        archive_player_id,
        current_player_id,
        archive_nickname,
        current_nickname
    );

    SELECT STRING_AGG(
        alias.current_nickname, ', ' ORDER BY alias.current_nickname
    )
    INTO missing_profiles
    FROM season8_player_aliases alias
    LEFT JOIN players player
      ON player.discord_id = alias.current_player_id
    WHERE player.discord_id IS NULL;

    IF missing_profiles IS NOT NULL THEN
        RAISE EXCEPTION
            'Не найдены актуальные профили игроков сезона 8: %',
            missing_profiles;
    END IF;

    INSERT INTO season_participants (
        tournament_id,
        player_id,
        nickname_snapshot,
        standings_section,
        inactive_reason,
        created_at
    )
    SELECT
        participant.tournament_id,
        alias.current_player_id,
        participant.nickname_snapshot,
        participant.standings_section,
        participant.inactive_reason,
        participant.created_at
    FROM season_participants participant
    JOIN season8_player_aliases alias
      ON alias.archive_player_id = participant.player_id
    ON CONFLICT (tournament_id, player_id) DO NOTHING;

    INSERT INTO season_match_participants (
        match_id,
        player_id,
        nickname_snapshot,
        team_side,
        is_captain,
        created_at
    )
    SELECT
        participant.match_id,
        alias.current_player_id,
        participant.nickname_snapshot,
        participant.team_side,
        participant.is_captain,
        participant.created_at
    FROM season_match_participants participant
    JOIN season8_player_aliases alias
      ON alias.archive_player_id = participant.player_id
    ON CONFLICT (match_id, player_id) DO NOTHING;

    INSERT INTO season_penalty_events (
        tournament_id,
        player_id,
        round_id,
        fire_count,
        note,
        created_at,
        updated_at
    )
    SELECT
        penalty.tournament_id,
        alias.current_player_id,
        penalty.round_id,
        penalty.fire_count,
        penalty.note,
        penalty.created_at,
        penalty.updated_at
    FROM season_penalty_events penalty
    JOIN season8_player_aliases alias
      ON alias.archive_player_id = penalty.player_id
    ON CONFLICT (tournament_id, player_id, round_id) DO UPDATE
    SET fire_count = GREATEST(
            season_penalty_events.fire_count,
            EXCLUDED.fire_count
        ),
        note = COALESCE(season_penalty_events.note, EXCLUDED.note),
        updated_at = GREATEST(
            season_penalty_events.updated_at,
            EXCLUDED.updated_at
        );

    INSERT INTO season_finalists (
        tournament_id,
        player_id,
        seed,
        medal,
        note,
        created_at,
        updated_at
    )
    SELECT
        finalist.tournament_id,
        alias.current_player_id,
        finalist.seed,
        finalist.medal,
        finalist.note,
        finalist.created_at,
        finalist.updated_at
    FROM season_finalists finalist
    JOIN season8_player_aliases alias
      ON alias.archive_player_id = finalist.player_id
    ON CONFLICT (tournament_id, player_id) DO NOTHING;

    UPDATE season_point_adjustments adjustment
    SET player_id = alias.current_player_id
    FROM season8_player_aliases alias
    WHERE adjustment.player_id = alias.archive_player_id;

    UPDATE season_match_substitutions substitution
    SET outgoing_player_id = alias.current_player_id
    FROM season8_player_aliases alias
    WHERE substitution.outgoing_player_id = alias.archive_player_id;

    UPDATE season_match_substitutions substitution
    SET incoming_player_id = alias.current_player_id
    FROM season8_player_aliases alias
    WHERE substitution.incoming_player_id = alias.archive_player_id;

    DELETE FROM season_penalty_events penalty
    USING season8_player_aliases alias
    WHERE penalty.player_id = alias.archive_player_id;

    DELETE FROM season_finalists finalist
    USING season8_player_aliases alias
    WHERE finalist.player_id = alias.archive_player_id;

    DELETE FROM season_match_participants participant
    USING season8_player_aliases alias
    WHERE participant.player_id = alias.archive_player_id;

    DELETE FROM season_participants participant
    USING season8_player_aliases alias
    WHERE participant.player_id = alias.archive_player_id;

    DELETE FROM players player
    USING season8_player_aliases alias
    WHERE player.discord_id = alias.archive_player_id;
END
$migration$;
