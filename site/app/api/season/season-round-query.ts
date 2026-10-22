/** Uses actual post delivery, so finishing matches alone cannot advance the highlighted round. */
export function seasonRoundQuery(isOrganizer: boolean) {
  const visibility = isOrganizer ? "" : "AND round.is_visible = TRUE";
  return `SELECT round.id::int, round.tournament_id::int,
           round.round_number::int, round.name,
           CASE WHEN round.round_kind = 'regular'
             THEN season_round_status_at(round.scheduled_at, round.status)
             ELSE round.status
           END AS status,
           EXISTS (
             SELECT 1 FROM channel_announcement_outbox announcement
             WHERE announcement.dedupe_key = format('season-round-results-tournament-%s-round-%s', round.tournament_id, round.round_number)
               AND announcement.status = 'sent'
           ) AS results_announced,
           round.scheduled_at, round.is_visible, round.round_kind,
           round.lobby_configuration_status,
           COUNT(DISTINCT lobby.id)::int AS lobby_count,
           COUNT(DISTINCT match.id) FILTER (
             WHERE match.status <> 'cancelled'
           )::int AS match_count,
           COUNT(DISTINCT match.id) FILTER (
             WHERE match.status = 'completed'
           )::int AS played_match_count,
           COUNT(DISTINCT registration.player_id)::int AS registration_count,
           COALESCE(BOOL_OR(registration.player_id = $2::bigint), FALSE)
             AS is_registered,
           EXISTS (
             SELECT 1 FROM season_round_checkins checkin
             WHERE checkin.round_id = round.id
               AND checkin.player_id = $2::bigint
           ) AS is_checked_in
         FROM season_rounds round
         LEFT JOIN season_lobbies lobby ON lobby.round_id = round.id
         LEFT JOIN season_matches match ON match.lobby_id = lobby.id
         LEFT JOIN season_round_registrations registration
           ON registration.round_id = round.id
         WHERE round.tournament_id = $1 ${visibility}
         GROUP BY round.id
         ORDER BY round.round_number`;
}
