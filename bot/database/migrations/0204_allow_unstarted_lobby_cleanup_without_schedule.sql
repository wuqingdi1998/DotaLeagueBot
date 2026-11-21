CREATE OR REPLACE FUNCTION remove_unstarted_season_lobby_player(
    target_round_id BIGINT, target_player_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $function$
DECLARE
    target_match RECORD;
    affected_match_id BIGINT;
BEGIN
    PERFORM 1 FROM season_rounds WHERE id = target_round_id FOR UPDATE;
    IF NOT EXISTS (
        SELECT 1 FROM season_match_participants participant
        JOIN season_matches match ON match.id = participant.match_id
        JOIN season_lobbies lobby ON lobby.id = match.lobby_id
        WHERE lobby.round_id = target_round_id
          AND participant.player_id = target_player_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Historical results and an already started room require substitutions.
    IF NOT EXISTS (
        SELECT 1 FROM season_rounds
        WHERE id = target_round_id AND round_kind = 'regular'
          AND status = 'planned'
    ) THEN
        RETURN FALSE;
    END IF;
    FOR target_match IN
        SELECT match.id, match.status
        FROM season_matches match
        JOIN season_lobbies lobby ON lobby.id = match.lobby_id
        WHERE lobby.round_id = target_round_id
        FOR UPDATE OF match
    LOOP
        PERFORM 1 FROM season_match_rooms
        WHERE match_id = target_match.id FOR UPDATE;
        IF target_match.status NOT IN ('draft', 'published') OR EXISTS (
            SELECT 1 FROM season_match_rooms
            WHERE match_id = target_match.id AND status <> 'waiting'
        ) OR EXISTS (
            SELECT 1 FROM season_match_games
            WHERE match_id = target_match.id AND status <> 'draft'
        ) OR EXISTS (
            SELECT 1 FROM draft_series WHERE season_match_id = target_match.id
        ) OR EXISTS (
            SELECT 1 FROM season_match_substitutions
            WHERE match_id = target_match.id
        ) THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    FOR affected_match_id IN
        DELETE FROM season_match_participants participant
        USING season_matches match, season_lobbies lobby
        WHERE participant.match_id = match.id AND match.lobby_id = lobby.id
          AND lobby.round_id = target_round_id
          AND participant.player_id = target_player_id
        RETURNING participant.match_id
    LOOP
        UPDATE season_matches SET host_player_id = NULL, updated_at = NOW()
        WHERE id = affected_match_id AND host_player_id = target_player_id;
        UPDATE season_match_rooms
        SET team_a_captain_id = CASE WHEN team_a_captain_id = target_player_id
                THEN NULL ELSE team_a_captain_id END,
            team_b_captain_id = CASE WHEN team_b_captain_id = target_player_id
                THEN NULL ELSE team_b_captain_id END,
            updated_at = NOW()
        WHERE match_id = affected_match_id;
        DELETE FROM season_match_room_presence
        WHERE match_id = affected_match_id AND player_id = target_player_id;
        DELETE FROM season_match_captain_preferences
        WHERE match_id = affected_match_id AND player_id = target_player_id;
        DELETE FROM season_match_captain_votes
        WHERE match_id = affected_match_id
          AND (voter_player_id = target_player_id
               OR candidate_player_id = target_player_id);
        DELETE FROM season_match_captain_tiebreaks
        WHERE match_id = affected_match_id
          AND target_player_id IN (voter_player_id, candidate_one_id,
                                   candidate_two_id, selected_candidate_id);
    END LOOP;

    UPDATE season_rounds
    SET lobby_configuration_status = 'editing', updated_at = NOW()
    WHERE id = target_round_id AND lobby_configuration_status IN ('locked', 'published');
    FOR affected_match_id IN
        SELECT match.id FROM season_matches match
        JOIN season_lobbies lobby ON lobby.id = match.lobby_id
        WHERE lobby.round_id = target_round_id
    LOOP
        PERFORM sync_season_lobby_notifications(affected_match_id);
    END LOOP;
    RETURN TRUE;
END;
$function$;


