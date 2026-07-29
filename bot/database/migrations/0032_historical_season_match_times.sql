UPDATE season_rounds round
SET scheduled_at = (
    DATE(round.scheduled_at AT TIME ZONE 'Europe/Moscow') + TIME '22:00'
) AT TIME ZONE 'Europe/Moscow'
FROM tournaments tournament
WHERE tournament.id = round.tournament_id
  AND tournament.tournament_type = 'seasonal'
  AND tournament.slug <> 'league-season-8'
  AND round.scheduled_at IS NOT NULL;

UPDATE season_lobbies lobby
SET scheduled_at = (
    DATE(lobby.scheduled_at AT TIME ZONE 'Europe/Moscow') + TIME '22:00'
) AT TIME ZONE 'Europe/Moscow'
FROM season_rounds round
JOIN tournaments tournament ON tournament.id = round.tournament_id
WHERE round.id = lobby.round_id
  AND tournament.tournament_type = 'seasonal'
  AND tournament.slug <> 'league-season-8'
  AND lobby.scheduled_at IS NOT NULL;

UPDATE season_matches match
SET scheduled_at = (
    DATE(match.scheduled_at AT TIME ZONE 'Europe/Moscow') + TIME '22:00'
) AT TIME ZONE 'Europe/Moscow'
FROM season_lobbies lobby
JOIN season_rounds round ON round.id = lobby.round_id
JOIN tournaments tournament ON tournament.id = round.tournament_id
WHERE lobby.id = match.lobby_id
  AND tournament.tournament_type = 'seasonal'
  AND tournament.slug <> 'league-season-8'
  AND match.scheduled_at IS NOT NULL;
