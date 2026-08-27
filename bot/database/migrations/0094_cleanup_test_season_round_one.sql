DO $$
DECLARE
    target_tournament_id BIGINT;
    target_round_id BIGINT;
    affected_player_ids BIGINT[];
    played_match_count INTEGER;
BEGIN
    SELECT tournament.id, round.id
    INTO target_tournament_id, target_round_id
    FROM tournaments tournament
    JOIN season_rounds round ON round.tournament_id = tournament.id
    WHERE tournament.slug = 'league-season-9-test'
      AND tournament.tournament_type = 'seasonal'
      AND round.round_number = 1
      AND round.round_kind = 'regular'
    FOR UPDATE OF tournament, round;

    IF target_round_id IS NULL THEN
        RETURN;
    END IF;

    SELECT COUNT(*)::int
    INTO played_match_count
    FROM season_matches match
    JOIN season_lobbies lobby ON lobby.id = match.lobby_id
    WHERE lobby.round_id = target_round_id
      AND (
          match.status = 'completed'
          OR EXISTS (
              SELECT 1
              FROM season_match_games game
              WHERE game.match_id = match.id
                AND game.status IN ('published', 'completed')
          )
      );

    IF played_match_count > 0 THEN
        RAISE EXCEPTION
            'Refusing to clean league-season-9-test round 1: played matches exist';
    END IF;

    SELECT ARRAY(
        SELECT registration.player_id
        FROM season_round_registrations registration
        WHERE registration.round_id = target_round_id
        UNION
        SELECT participant.player_id
        FROM season_match_participants participant
        JOIN season_matches match ON match.id = participant.match_id
        JOIN season_lobbies lobby ON lobby.id = match.lobby_id
        WHERE lobby.round_id = target_round_id
    )
    INTO affected_player_ids;

    DELETE FROM notification_outbox
    WHERE season_round_id = target_round_id;

    DELETE FROM season_round_discord_channel_members
    WHERE round_id = target_round_id;

    DELETE FROM season_round_registrations
    WHERE round_id = target_round_id;

    DELETE FROM season_lobbies
    WHERE round_id = target_round_id;

    DELETE FROM season_participants participant
    WHERE participant.tournament_id = target_tournament_id
      AND participant.player_id = ANY(affected_player_ids)
      AND NOT EXISTS (
          SELECT 1
          FROM season_round_registrations registration
          JOIN season_rounds round ON round.id = registration.round_id
          WHERE round.tournament_id = target_tournament_id
            AND registration.player_id = participant.player_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM season_match_participants match_participant
          JOIN season_matches match ON match.id = match_participant.match_id
          JOIN season_lobbies lobby ON lobby.id = match.lobby_id
          JOIN season_rounds round ON round.id = lobby.round_id
          WHERE round.tournament_id = target_tournament_id
            AND match_participant.player_id = participant.player_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM season_point_adjustments adjustment
          WHERE adjustment.tournament_id = target_tournament_id
            AND adjustment.player_id = participant.player_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM season_penalty_events penalty
          WHERE penalty.tournament_id = target_tournament_id
            AND penalty.player_id = participant.player_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM season_finalists finalist
          WHERE finalist.tournament_id = target_tournament_id
            AND finalist.player_id = participant.player_id
      );

    UPDATE season_rounds
    SET status = 'completed',
        lobby_configuration_status = 'none',
        updated_at = NOW()
    WHERE id = target_round_id;

    INSERT INTO tournament_audit_log (
        tournament_id,
        action,
        entity_type,
        entity_id,
        details
    )
    VALUES (
        target_tournament_id,
        'cleanup',
        'season_round',
        target_round_id::text,
        jsonb_build_object(
            'reason', 'test round reset because no matches were played',
            'roundNumber', 1
        )
    );
END $$;
