UPDATE season_participants participant
SET standings_snapshot = jsonb_set(
    participant.standings_snapshot,
    '{winRate}',
    'null'::jsonb,
    FALSE
)
FROM tournaments tournament
WHERE tournament.id = participant.tournament_id
  AND tournament.slug IN (
      'league-season-4',
      'league-season-5',
      'league-season-6',
      'league-season-7'
  )
  AND jsonb_typeof(participant.standings_snapshot->'winRate') = 'number'
  AND (
      (participant.standings_snapshot->>'winRate')::numeric < 0
      OR (participant.standings_snapshot->>'winRate')::numeric > 1
  );
