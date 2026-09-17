ALTER TABLE close_events
    ADD COLUMN IF NOT EXISTS tournament_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS close_events_tournament_id_unique
    ON close_events(tournament_id)
    WHERE tournament_id IS NOT NULL;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'close_events_tournament_id_fkey'
    ) THEN
        ALTER TABLE close_events
            ADD CONSTRAINT close_events_tournament_id_fkey
            FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
            ON DELETE SET NULL;
    END IF;
END
$migration$;

ALTER TABLE notification_outbox
    ADD COLUMN IF NOT EXISTS close_event_id INTEGER
        REFERENCES close_events(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_close_event_unique
    ON notification_outbox(discord_id, close_event_id, event_type)
    WHERE close_event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_close_tournament_participants(
    target_close_event_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
    target_tournament_id BIGINT;
    target_round_id BIGINT;
BEGIN
    SELECT event.tournament_id
    INTO target_tournament_id
    FROM close_events event
    WHERE event.id = target_close_event_id;

    IF target_tournament_id IS NULL THEN
        RETURN;
    END IF;

    SELECT round.id
    INTO target_round_id
    FROM season_rounds round
    WHERE round.tournament_id = target_tournament_id
      AND round.round_kind = 'regular'
    ORDER BY round.round_number
    LIMIT 1;

    DELETE FROM season_match_participants participant
    USING season_matches match, season_lobbies lobby
    WHERE participant.match_id = match.id
      AND match.lobby_id = lobby.id
      AND lobby.round_id = target_round_id
      AND participant.player_id NOT IN (
          SELECT registered.player_id
          FROM close_events event
          CROSS JOIN LATERAL (
              SELECT CASE WHEN value ~ '^[0-9]{5,20}$'
                  THEN value::BIGINT END AS player_id
              FROM regexp_split_to_table(
                  COALESCE(event.participant_ids, ''), ','
              ) value
              WHERE value ~ '^[0-9]{5,20}$'
          ) registered
          WHERE event.id = target_close_event_id
      );

    DELETE FROM season_round_registrations registration
    WHERE registration.round_id = target_round_id
      AND registration.player_id NOT IN (
          SELECT CASE WHEN value ~ '^[0-9]{5,20}$'
              THEN value::BIGINT END
          FROM close_events event
          CROSS JOIN LATERAL regexp_split_to_table(
              COALESCE(event.participant_ids, ''), ','
          ) value
          WHERE event.id = target_close_event_id
            AND value ~ '^[0-9]{5,20}$'
      );

    DELETE FROM season_participants participant
    WHERE participant.tournament_id = target_tournament_id
      AND participant.player_id NOT IN (
          SELECT CASE WHEN value ~ '^[0-9]{5,20}$'
              THEN value::BIGINT END
          FROM close_events event
          CROSS JOIN LATERAL regexp_split_to_table(
              COALESCE(event.participant_ids, ''), ','
          ) value
          WHERE event.id = target_close_event_id
            AND value ~ '^[0-9]{5,20}$'
      );

    INSERT INTO season_participants (
        tournament_id, player_id, nickname_snapshot
    )
    SELECT target_tournament_id, player.discord_id, player.ingame_name
    FROM close_events event
    CROSS JOIN LATERAL regexp_split_to_table(
        COALESCE(event.participant_ids, ''), ','
    ) value
    JOIN players player ON player.discord_id = CASE
        WHEN value ~ '^[0-9]{5,20}$' THEN value::BIGINT END
    WHERE event.id = target_close_event_id
      AND value ~ '^[0-9]{5,20}$'
      AND player.is_archived = FALSE
    ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET nickname_snapshot = EXCLUDED.nickname_snapshot;

    INSERT INTO season_round_registrations (
        round_id, player_id, tier_snapshot, created_at
    )
    SELECT
        target_round_id,
        player.discord_id,
        GREATEST(1, LEAST(12, COALESCE(
            NULLIF(player.internal_rating, 0),
            CASE
                WHEN player.rank_tier >= 10 THEN player.rank_tier / 10
                WHEN player.rank_tier > 0 THEN player.rank_tier
                ELSE 1
            END
        )))::SMALLINT,
        COALESCE(
            (
                SELECT to_timestamp(CASE
                    WHEN split_part(joined.value, ':', 2) ~ '^[0-9]+$'
                        THEN split_part(joined.value, ':', 2)::BIGINT
                    END)
                FROM regexp_split_to_table(
                    COALESCE(event.participant_joined_at, ''), ','
                ) joined(value)
                WHERE split_part(joined.value, ':', 1) = player.discord_id::TEXT
                  AND split_part(joined.value, ':', 2) ~ '^[0-9]+$'
                LIMIT 1
            ),
            event.created_at
        )
    FROM close_events event
    CROSS JOIN LATERAL regexp_split_to_table(
        COALESCE(event.participant_ids, ''), ','
    ) value
    JOIN players player ON player.discord_id = CASE
        WHEN value ~ '^[0-9]{5,20}$' THEN value::BIGINT END
    WHERE event.id = target_close_event_id
      AND value ~ '^[0-9]{5,20}$'
      AND player.is_archived = FALSE
    ON CONFLICT (round_id, player_id) DO UPDATE
    SET tier_snapshot = EXCLUDED.tier_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION ensure_close_tournament(
    target_close_event_id INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $function$
DECLARE
    event close_events%ROWTYPE;
    created_tournament_id BIGINT;
    canonical_format TEXT;
    start_at_value TIMESTAMPTZ;
BEGIN
    SELECT * INTO event
    FROM close_events
    WHERE id = target_close_event_id
    FOR UPDATE;

    IF event.id IS NULL THEN
        RAISE EXCEPTION 'Close event % was not found', target_close_event_id;
    END IF;

    IF event.tournament_id IS NOT NULL THEN
        PERFORM sync_close_tournament_participants(event.id);
        RETURN event.tournament_id;
    END IF;

    canonical_format := CASE
        WHEN LOWER(BTRIM(event.game_format)) LIKE '%fearless%'
            THEN 'Fearless Draft'
        WHEN UPPER(BTRIM(event.game_format)) IN ('CM', 'CD', 'SD')
            THEN UPPER(BTRIM(event.game_format))
        ELSE 'CM'
    END;
    start_at_value := to_timestamp(event.start_ts);

    INSERT INTO tournaments (
        slug, name, eyebrow, headline, headline_accent, description, about,
        start_at, end_at, registration_deadline, status_label, format,
        team_size, max_teams, region, server, check_in_minutes,
        group_format, playoff_format, final_format, discord_url, status,
        playoff_type, tournament_type, season_round_count,
        show_tiers, ordinary_match_rooms_enabled
    ) VALUES (
        'close-' || event.message_id,
        'Клоз ' || to_char(start_at_value AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY HH24:MI'),
        'Клоз',
        'Клоз-матч',
        '',
        'Один матч для участников, зарегистрированных в анонсе клоза.',
        'Составы формируются организатором из списка участников анонса.',
        start_at_value,
        start_at_value + INTERVAL '6 hours',
        start_at_value,
        CASE
            WHEN start_at_value > NOW() THEN 'Регистрация'
            WHEN start_at_value + INTERVAL '6 hours' > NOW() THEN 'Идёт сейчас'
            ELSE 'Завершён'
        END,
        canonical_format,
        5, 2, 'EU / RU', 'EU West', 10,
        'Один матч', 'Нет', 'Нет',
        'https://discord.gg/lsesports',
        CASE
            WHEN start_at_value > NOW() THEN 'registration'
            WHEN start_at_value + INTERVAL '6 hours' > NOW() THEN 'active'
            ELSE 'finished'
        END,
        'single_elimination', 'seasonal', 1, FALSE, FALSE
    )
    RETURNING id INTO created_tournament_id;

    UPDATE close_events
    SET tournament_id = created_tournament_id
    WHERE id = event.id;

    INSERT INTO tournament_organizers (tournament_id, discord_id)
    SELECT created_tournament_id, event.host_id
    FROM players player
    WHERE player.discord_id = event.host_id
      AND player.is_archived = FALSE
    ON CONFLICT DO NOTHING;

    INSERT INTO season_rounds (
        tournament_id, round_number, name, status, scheduled_at,
        is_visible, round_kind, lobby_configuration_status
    ) VALUES (
        created_tournament_id, 1, 'Матч',
        CASE
            WHEN start_at_value > NOW() THEN 'planned'
            WHEN start_at_value + INTERVAL '6 hours' > NOW() THEN 'active'
            ELSE 'completed'
        END,
        start_at_value, TRUE, 'regular', 'none'
    );

    PERFORM sync_close_tournament_participants(event.id);
    RETURN created_tournament_id;
END
$function$;

SELECT ensure_close_tournament(event.id)
FROM close_events event
WHERE event.tournament_id IS NULL;
