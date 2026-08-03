DO $migration$
DECLARE
    unresolved_aliases TEXT;
BEGIN
    CREATE TEMP TABLE historical_season_alias_repairs ON COMMIT DROP AS
    SELECT *
    FROM (
        VALUES
            ('league-season-4', 'NineTeen', 'Komaru', '1061951145'),
            ('league-season-4', 'D', 'Decadence', NULL),
            ('league-season-4', 'resolved', 'resovled', NULL),
            ('league-season-4', 'z3r0n', 'zer0n', NULL),
            ('league-season-5', 'wispiq', 'violltany', NULL),
            ('league-season-5', 'Komaru~', 'XOM94OK', '1674981969'),
            ('league-season-6', 'serenity', 'Kotic diff', '1674981969'),
            ('league-season-6', 'Pancake', 'Morana', '1209199029'),
            ('league-season-6', 'shu', 'shh', '256548737')
    ) AS repair(
        tournament_slug,
        primary_nickname,
        alias_nickname,
        registered_dota_id
    );

    CREATE TEMP TABLE historical_season_alias_resolutions ON COMMIT DROP AS
    SELECT
        repair.*,
        tournament.id AS tournament_id,
        primary_match.player_ids AS primary_player_ids,
        alias_match.player_ids AS alias_player_ids
    FROM historical_season_alias_repairs repair
    LEFT JOIN tournaments tournament
      ON tournament.slug = repair.tournament_slug
    LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(participant.player_id) AS player_ids
        FROM season_participants participant
        WHERE participant.tournament_id = tournament.id
          AND LOWER(BTRIM(participant.nickname_snapshot)) =
              LOWER(BTRIM(repair.primary_nickname))
    ) primary_match ON TRUE
    LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(participant.player_id) AS player_ids
        FROM season_participants participant
        WHERE participant.tournament_id = tournament.id
          AND LOWER(BTRIM(participant.nickname_snapshot)) =
              LOWER(BTRIM(repair.alias_nickname))
    ) alias_match ON TRUE;

    SELECT STRING_AGG(
        resolution.tournament_slug || ': ' ||
        resolution.primary_nickname || ' / ' || resolution.alias_nickname,
        ', ' ORDER BY resolution.tournament_slug, resolution.primary_nickname
    )
    INTO unresolved_aliases
    FROM historical_season_alias_resolutions resolution
    WHERE resolution.tournament_id IS NULL
       OR COALESCE(CARDINALITY(resolution.primary_player_ids), 0) <> 1
       OR COALESCE(CARDINALITY(resolution.alias_player_ids), 0) <> 1
       OR resolution.primary_player_ids[1] = resolution.alias_player_ids[1];

    IF unresolved_aliases IS NOT NULL THEN
        RAISE EXCEPTION
            'Не удалось однозначно найти исторические записи: %',
            unresolved_aliases;
    END IF;

    CREATE TEMP TABLE historical_season_alias_map ON COMMIT DROP AS
    SELECT
        resolution.tournament_slug,
        resolution.primary_nickname,
        resolution.alias_nickname,
        resolution.registered_dota_id,
        resolution.tournament_id,
        resolution.primary_player_ids[1] AS primary_player_id,
        resolution.alias_player_ids[1] AS alias_player_id
    FROM historical_season_alias_resolutions resolution;

    IF EXISTS (
        SELECT 1
        FROM historical_season_alias_map alias_map
        JOIN season_match_participants alias_participant
          ON alias_participant.player_id = alias_map.alias_player_id
        JOIN season_match_participants primary_participant
          ON primary_participant.match_id = alias_participant.match_id
         AND primary_participant.player_id = alias_map.primary_player_id
        JOIN season_matches match ON match.id = alias_participant.match_id
        JOIN season_lobbies lobby ON lobby.id = match.lobby_id
        JOIN season_rounds round ON round.id = lobby.round_id
         AND round.tournament_id = alias_map.tournament_id
    ) THEN
        RAISE EXCEPTION
            'Основной и альтернативный ники найдены в одном матче';
    END IF;

    UPDATE season_match_participants participant
    SET player_id = alias_map.primary_player_id
    FROM historical_season_alias_map alias_map
    JOIN season_matches match ON TRUE
    JOIN season_lobbies lobby ON lobby.id = match.lobby_id
    JOIN season_rounds round ON round.id = lobby.round_id
     AND round.tournament_id = alias_map.tournament_id
    WHERE participant.match_id = match.id
      AND participant.player_id = alias_map.alias_player_id;

    UPDATE season_point_adjustments adjustment
    SET player_id = alias_map.primary_player_id
    FROM historical_season_alias_map alias_map
    WHERE adjustment.tournament_id = alias_map.tournament_id
      AND adjustment.player_id = alias_map.alias_player_id;

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
        alias_map.primary_player_id,
        penalty.round_id,
        penalty.fire_count,
        penalty.note,
        penalty.created_at,
        penalty.updated_at
    FROM season_penalty_events penalty
    JOIN historical_season_alias_map alias_map
      ON alias_map.tournament_id = penalty.tournament_id
     AND alias_map.alias_player_id = penalty.player_id
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

    DELETE FROM season_penalty_events penalty
    USING historical_season_alias_map alias_map
    WHERE penalty.tournament_id = alias_map.tournament_id
      AND penalty.player_id = alias_map.alias_player_id;

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
        alias_map.primary_player_id,
        finalist.seed,
        finalist.medal,
        finalist.note,
        finalist.created_at,
        finalist.updated_at
    FROM season_finalists finalist
    JOIN historical_season_alias_map alias_map
      ON alias_map.tournament_id = finalist.tournament_id
     AND alias_map.alias_player_id = finalist.player_id
    ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET seed = COALESCE(season_finalists.seed, EXCLUDED.seed),
        medal = COALESCE(season_finalists.medal, EXCLUDED.medal),
        note = COALESCE(season_finalists.note, EXCLUDED.note),
        updated_at = GREATEST(
            season_finalists.updated_at,
            EXCLUDED.updated_at
        );

    DELETE FROM season_finalists finalist
    USING historical_season_alias_map alias_map
    WHERE finalist.tournament_id = alias_map.tournament_id
      AND finalist.player_id = alias_map.alias_player_id;

    UPDATE season_match_substitutions substitution
    SET outgoing_player_id = alias_map.primary_player_id
    FROM historical_season_alias_map alias_map
    JOIN season_matches match ON TRUE
    JOIN season_lobbies lobby ON lobby.id = match.lobby_id
    JOIN season_rounds round ON round.id = lobby.round_id
     AND round.tournament_id = alias_map.tournament_id
    WHERE substitution.match_id = match.id
      AND substitution.outgoing_player_id = alias_map.alias_player_id;

    UPDATE season_match_substitutions substitution
    SET incoming_player_id = alias_map.primary_player_id
    FROM historical_season_alias_map alias_map
    JOIN season_matches match ON TRUE
    JOIN season_lobbies lobby ON lobby.id = match.lobby_id
    JOIN season_rounds round ON round.id = lobby.round_id
     AND round.tournament_id = alias_map.tournament_id
    WHERE substitution.match_id = match.id
      AND substitution.incoming_player_id = alias_map.alias_player_id;

    UPDATE player_identity_members member
    SET identity_id = COALESCE(
        registered_member.identity_id,
        primary_member.identity_id
    )
    FROM historical_season_alias_map alias_map
    JOIN player_identity_members primary_member
      ON primary_member.player_id = alias_map.primary_player_id
    LEFT JOIN players registered_player
      ON registered_player.steam_id32::TEXT = alias_map.registered_dota_id
     AND registered_player.is_archived = FALSE
    LEFT JOIN player_identity_members registered_member
      ON registered_member.player_id = registered_player.discord_id
    WHERE member.player_id IN (
        alias_map.primary_player_id,
        alias_map.alias_player_id
    )
      AND member.identity_id <> COALESCE(
          registered_member.identity_id,
          primary_member.identity_id
      );

    DELETE FROM season_participants participant
    USING historical_season_alias_map alias_map
    WHERE participant.tournament_id = alias_map.tournament_id
      AND participant.player_id = alias_map.alias_player_id;

    DELETE FROM player_identities identity
    WHERE identity.registered_player_id IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM player_identity_members member
          WHERE member.identity_id = identity.id
      );
END
$migration$;
