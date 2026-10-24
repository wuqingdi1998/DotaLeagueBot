-- Round nine belongs to the final event day even when its result arrives after midnight.
-- Keep the real task deadline and the frozen archive protections for all other awards.
CREATE OR REPLACE FUNCTION allow_october_admin_star_adjustment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    is_late_final_round BOOLEAN := FALSE;
BEGIN
    IF TG_OP <> 'DELETE' AND CURRENT_TIMESTAMP >= TIMESTAMPTZ '2026-10-26 00:00:00+03' THEN
        SELECT EXISTS (
            SELECT 1 FROM season_matches match
            JOIN season_lobbies lobby ON lobby.id = match.lobby_id
            JOIN season_rounds round ON round.id = lobby.round_id
            JOIN tournaments tournament ON tournament.id = round.tournament_id
            JOIN season_match_room_players participant ON participant.match_id = match.id
            WHERE match.id = NEW.season_match_id AND match.status = 'completed'
              AND tournament.slug = 'league-season-9' AND round.round_number = 9
              AND participant.player_id = NEW.player_id
              AND NEW.administered_by = 0 AND NEW.is_star_race_eligible = FALSE
              AND NEW.created_at = TIMESTAMPTZ '2026-10-26 00:00:00+03' - INTERVAL '1 microsecond'
              AND NEW.amount = CASE
                WHEN (CASE participant.team_side WHEN 'a' THEN match.team_a_score ELSE match.team_b_score END) >= 2 THEN 6
                WHEN (CASE participant.team_side WHEN 'a' THEN match.team_a_score ELSE match.team_b_score END) = 1 THEN 3
                ELSE 1 END
              AND NOT EXISTS (SELECT 1 FROM player_discord_roles role
                WHERE role.player_id = NEW.player_id AND role.role_name = 'Массовка')
        ) INTO is_late_final_round;
    END IF;
    IF (CURRENT_TIMESTAMP < TIMESTAMPTZ '2026-10-05 00:00:00+03'
        OR CURRENT_TIMESTAMP >= TIMESTAMPTZ '2026-10-26 00:00:00+03') AND NOT is_late_final_round
       OR (TG_OP <> 'INSERT' AND (OLD.created_at < TIMESTAMPTZ '2026-10-05 00:00:00+03'
            OR OLD.created_at >= TIMESTAMPTZ '2026-10-26 00:00:00+03'))
       OR (TG_OP <> 'DELETE' AND (NEW.created_at < TIMESTAMPTZ '2026-10-05 00:00:00+03'
            OR NEW.created_at >= TIMESTAMPTZ '2026-10-26 00:00:00+03')) THEN
        RAISE EXCEPTION 'Compendium adjustment is outside the active October period' USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NOT EXISTS (SELECT 1 FROM october_compendium_clan_members WHERE player_id = NEW.player_id)
       OR NOT compendium_stars_count_for_player(NEW.player_id, NEW.created_at) THEN
        RAISE EXCEPTION 'Player is not an active October participant' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
