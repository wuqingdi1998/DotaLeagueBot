INSERT INTO player_medals (
    player_id,
    tournament_id,
    medal_type,
    title,
    description,
    awarded_at
)
SELECT
    roster.player_id,
    tournament.id,
    CASE result.placement
        WHEN 1 THEN 'gold'::text
        WHEN 2 THEN 'silver'::text
        ELSE 'bronze'::text
    END,
    tournament.name,
    result.placement::text || '-е место в сезонном кубке',
    tournament.end_at
FROM tournaments AS tournament
JOIN tournament_team_applications AS application
  ON application.tournament_id = tournament.id
JOIN tournament_team_results AS result
  ON result.application_id = application.id
JOIN tournament_roster_snapshots AS roster
  ON roster.application_id = application.id
WHERE tournament.tournament_type = 'seasonal_cup'
  AND tournament.end_at < NOW()
  AND result.placement BETWEEN 1 AND 3
  AND roster.role <> 'coach'
  AND NOT EXISTS (
      SELECT 1
      FROM player_medals AS existing
      WHERE existing.player_id = roster.player_id
        AND existing.tournament_id = tournament.id
        AND existing.medal_type = CASE result.placement
            WHEN 1 THEN 'gold'::text
            WHEN 2 THEN 'silver'::text
            ELSE 'bronze'::text
        END
  );
