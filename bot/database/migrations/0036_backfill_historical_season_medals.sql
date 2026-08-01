INSERT INTO player_medals (
    player_id,
    tournament_id,
    medal_type,
    title,
    description,
    awarded_by
)
SELECT
    finalist.player_id,
    finalist.tournament_id,
    finalist.medal,
    tournament.name || CASE
        WHEN finalist.medal = 'gold' THEN ' — Победитель'
        ELSE ' — Финалист'
    END,
    'Награда восстановлена по официальным итогам сезонного финала',
    NULL
FROM season_finalists AS finalist
JOIN tournaments AS tournament
  ON tournament.id = finalist.tournament_id
WHERE tournament.tournament_type = 'seasonal'
  AND finalist.medal IN ('gold', 'silver')
  AND NOT EXISTS (
      SELECT 1
      FROM player_medals AS existing
      WHERE existing.player_id = finalist.player_id
        AND existing.tournament_id = finalist.tournament_id
        AND existing.medal_type = finalist.medal
  );
