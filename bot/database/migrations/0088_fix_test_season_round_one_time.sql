UPDATE season_rounds round
SET scheduled_at = TIMESTAMPTZ '2026-08-25 19:00:00+00',
    updated_at = NOW()
FROM tournaments tournament
WHERE tournament.id = round.tournament_id
  AND tournament.slug = 'league-season-9-copy'
  AND round.round_number = 1
  AND round.round_kind = 'regular'
  AND round.scheduled_at = TIMESTAMPTZ '2026-08-25 22:00:00+00';
