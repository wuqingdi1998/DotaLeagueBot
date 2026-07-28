UPDATE season_match_participants participant
SET player_id = eosom.player_id,
    nickname_snapshot = 'eosom',
    tier_snapshot = 8
FROM season_matches match
JOIN season_lobbies lobby ON lobby.id = match.lobby_id
JOIN season_rounds round ON round.id = lobby.round_id
JOIN tournaments tournament ON tournament.id = round.tournament_id
JOIN season_participants eosom
  ON eosom.tournament_id = tournament.id
 AND LOWER(BTRIM(eosom.nickname_snapshot)) = 'eosom'
WHERE participant.match_id = match.id
  AND tournament.slug = 'league-season-8'
  AND round.round_number = 4
  AND LOWER(BTRIM(participant.nickname_snapshot)) = 'yasama';

UPDATE season_rounds round
SET scheduled_at = (
      DATE_TRUNC(
        'day',
        round.scheduled_at AT TIME ZONE 'Europe/Moscow'
      ) + TIME '21:00'
    ) AT TIME ZONE 'Europe/Moscow',
    updated_at = NOW()
FROM tournaments tournament
WHERE tournament.id = round.tournament_id
  AND tournament.slug = 'league-season-8'
  AND round.scheduled_at IS NOT NULL;

UPDATE season_lobbies lobby
SET scheduled_at = round.scheduled_at,
    updated_at = NOW()
FROM season_rounds round
JOIN tournaments tournament ON tournament.id = round.tournament_id
WHERE lobby.round_id = round.id
  AND tournament.slug = 'league-season-8';

UPDATE season_matches match
SET scheduled_at = round.scheduled_at,
    updated_at = NOW()
FROM season_lobbies lobby
JOIN season_rounds round ON round.id = lobby.round_id
JOIN tournaments tournament ON tournament.id = round.tournament_id
WHERE match.lobby_id = lobby.id
  AND tournament.slug = 'league-season-8';
