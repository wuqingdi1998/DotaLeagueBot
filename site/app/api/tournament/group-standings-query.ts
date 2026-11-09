export const GROUP_STANDINGS_QUERY = `
  WITH groups AS (
    SELECT id, tournament_id, name, sort_order
    FROM tournament_groups
    WHERE tournament_id = $1
  ), team_matches AS (
    SELECT m.group_id, side.application_id, side.opponent_id,
      CASE side.result_label
        WHEN 'tw' THEN 1
        WHEN 'tl' THEN 0
        ELSE COALESCE(side.score, 0)
      END AS maps_won,
      CASE side.result_label
        WHEN 'tw' THEN 0
        WHEN 'tl' THEN 1
        ELSE COALESCE(side.opponent_score, 0)
      END AS maps_lost,
      side.score IS NOT NULL AND side.opponent_score IS NOT NULL
        AND side.opponent_label NOT IN ('tw', 'tl') AS has_played_score
    FROM tournament_matches m
    JOIN groups g ON g.id = m.group_id
    CROSS JOIN LATERAL (VALUES
      (m.team_a_application_id, m.team_b_application_id, m.team_a_score, m.team_b_score,
        LOWER(COALESCE(m.team_a_result_label, '')), LOWER(COALESCE(m.team_b_result_label, ''))),
      (m.team_b_application_id, m.team_a_application_id, m.team_b_score, m.team_a_score,
        LOWER(COALESCE(m.team_b_result_label, '')), LOWER(COALESCE(m.team_a_result_label, '')))
    ) side(application_id, opponent_id, score, opponent_score, result_label, opponent_label)
    WHERE m.status = 'finished'
  ), team_results AS (
    SELECT group_id, application_id, COUNT(*)::int AS games,
      COUNT(*) FILTER (WHERE maps_won > maps_lost)::int AS series_wins,
      SUM(maps_won)::int AS maps_won,
      SUM(maps_lost)::int AS maps_lost,
      json_agg(json_build_object(
        'opponent_id', opponent_id::int,
        'outcome', CASE
          WHEN maps_won > maps_lost THEN 'win'
          WHEN maps_won < maps_lost THEN 'loss'
          ELSE 'draw'
        END
      )) FILTER (
        WHERE opponent_id IS NOT NULL AND (maps_won <> maps_lost OR has_played_score)
      ) AS meetings
    FROM team_matches
    GROUP BY group_id, application_id
  )
  SELECT
    g.tournament_id::int,
    g.id::int AS group_id,
    a.id::int AS application_id,
    g.name AS group_name,
    a.team_name,
    COALESCE(r.games, 0)::int AS games,
    COALESCE(r.series_wins, 0)::int AS series_wins,
    COALESCE(r.maps_won, 0)::int AS maps_won,
    COALESCE(r.maps_lost, 0)::int AS maps_lost,
    COALESCE(r.meetings, '[]'::json) AS meetings
  FROM groups g
  JOIN tournament_group_teams gt ON gt.group_id = g.id
  JOIN tournament_team_applications a ON a.id = gt.application_id
  LEFT JOIN team_results r
    ON r.group_id = gt.group_id AND r.application_id = gt.application_id
  ORDER BY g.sort_order, g.id, gt.sort_order, a.team_name, a.id
`;
