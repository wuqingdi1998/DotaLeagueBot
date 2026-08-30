DO $$
DECLARE
    target_tournament_id BIGINT;
    target_round_id BIGINT;
    registration_count INTEGER;
    lobby_count INTEGER;
    match_count INTEGER;
    game_count INTEGER;
    standing_count INTEGER;
    adjustment_count INTEGER;
    penalty_count INTEGER;
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

    SELECT
        (
            SELECT COUNT(*)::int
            FROM season_round_registrations registration
            WHERE registration.round_id = target_round_id
        ),
        (
            SELECT COUNT(*)::int
            FROM season_lobbies lobby
            WHERE lobby.round_id = target_round_id
        ),
        (
            SELECT COUNT(*)::int
            FROM season_matches match
            JOIN season_lobbies lobby ON lobby.id = match.lobby_id
            WHERE lobby.round_id = target_round_id
        ),
        (
            SELECT COUNT(*)::int
            FROM season_match_games game
            JOIN season_matches match ON match.id = game.match_id
            JOIN season_lobbies lobby ON lobby.id = match.lobby_id
            WHERE lobby.round_id = target_round_id
        ),
        (
            SELECT COUNT(*)::int
            FROM season_participants participant
            WHERE participant.tournament_id = target_tournament_id
        ),
        (
            SELECT COUNT(*)::int
            FROM season_point_adjustments adjustment
            WHERE adjustment.tournament_id = target_tournament_id
        ),
        (
            SELECT COUNT(*)::int
            FROM season_penalty_events penalty
            WHERE penalty.tournament_id = target_tournament_id
        )
    INTO registration_count, lobby_count, match_count, game_count,
        standing_count, adjustment_count, penalty_count;

    DELETE FROM notification_outbox
    WHERE season_round_id = target_round_id;

    DELETE FROM season_round_discord_channel_members
    WHERE round_id = target_round_id;

    DELETE FROM season_point_adjustments
    WHERE tournament_id = target_tournament_id;

    DELETE FROM season_penalty_events
    WHERE tournament_id = target_tournament_id;

    DELETE FROM season_finalists
    WHERE tournament_id = target_tournament_id;

    DELETE FROM player_medals
    WHERE tournament_id = target_tournament_id;

    DELETE FROM season_round_registrations
    WHERE round_id = target_round_id;

    DELETE FROM season_lobbies
    WHERE round_id = target_round_id;

    DELETE FROM season_participants
    WHERE tournament_id = target_tournament_id;

    UPDATE season_rounds
    SET status = season_round_status_at(scheduled_at, 'planned'),
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
        'reset',
        'season_round',
        target_round_id::text,
        jsonb_build_object(
            'reason', 'full test round and standings reset',
            'roundNumber', 1,
            'registrationsRemoved', registration_count,
            'lobbiesRemoved', lobby_count,
            'matchesRemoved', match_count,
            'gamesRemoved', game_count,
            'standingsRemoved', standing_count,
            'adjustmentsRemoved', adjustment_count,
            'penaltiesRemoved', penalty_count
        )
    );
END $$;
