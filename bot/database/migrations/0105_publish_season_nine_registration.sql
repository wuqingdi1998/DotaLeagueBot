UPDATE tournaments
SET status = 'registration', updated_at = NOW()
WHERE slug = 'league-season-9'
  AND status IN ('draft', 'planned');

UPDATE season_rounds AS round
SET is_visible = TRUE, updated_at = NOW()
FROM tournaments AS tournament
WHERE round.tournament_id = tournament.id
  AND tournament.slug = 'league-season-9'
  AND round.round_kind = 'regular';
