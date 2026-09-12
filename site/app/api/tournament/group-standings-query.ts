export const GROUP_STANDINGS_QUERY = `
  WITH team_results AS (
    SELECT gt.group_id, gt.application_id,
      COUNT(m.id) FILTER (WHERE m.status = 'finished')::int AS games,
      COALESCE(SUM(
        CASE
          WHEN m.status <> 'finished' THEN 0
          WHEN m.team_a_application_id = gt.application_id THEN
            CASE
              WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tw' THEN 1
              WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tl' THEN 0
              WHEN COALESCE(m.team_a_score, 0) > COALESCE(m.team_b_score, 0) THEN 1
              ELSE 0
            END
          WHEN m.team_b_application_id = gt.application_id THEN
            CASE
              WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tw' THEN 1
              WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tl' THEN 0
              WHEN COALESCE(m.team_b_score, 0) > COALESCE(m.team_a_score, 0) THEN 1
              ELSE 0
            END
          ELSE 0
        END
      ), 0)::int AS series_wins,
      COALESCE(SUM(
        CASE
          WHEN m.status <> 'finished' THEN 0
          WHEN m.team_a_application_id = gt.application_id THEN
            CASE
              WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tw' THEN 1
              WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tl' THEN 0
              ELSE COALESCE(m.team_a_score, 0)
            END
          WHEN m.team_b_application_id = gt.application_id THEN
            CASE
              WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tw' THEN 1
              WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tl' THEN 0
              ELSE COALESCE(m.team_b_score, 0)
            END
          ELSE 0
        END
      ), 0)::int AS maps_won,
      COALESCE(SUM(
        CASE
          WHEN m.status <> 'finished' THEN 0
          WHEN m.team_a_application_id = gt.application_id THEN
            CASE
              WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tw' THEN 0
              WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tl' THEN 1
              ELSE COALESCE(m.team_b_score, 0)
            END
          WHEN m.team_b_application_id = gt.application_id THEN
            CASE
              WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tw' THEN 0
              WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tl' THEN 1
              ELSE COALESCE(m.team_a_score, 0)
            END
          ELSE 0
        END
      ), 0)::int AS maps_lost
    FROM tournament_group_teams gt
    LEFT JOIN tournament_matches m
      ON m.group_id = gt.group_id
      AND gt.application_id IN (
        m.team_a_application_id, m.team_b_application_id
      )
    GROUP BY gt.group_id, gt.application_id
  )
  SELECT
    ROW_NUMBER() OVER (
      PARTITION BY g.id
      ORDER BY COALESCE(r.series_wins, 0) DESC, gt.sort_order, a.team_name
    )::int AS id,
    g.tournament_id::int,
    g.id::int AS group_id,
    a.id::int AS application_id,
    g.name AS group_name,
    ROW_NUMBER() OVER (
      PARTITION BY g.id
      ORDER BY COALESCE(r.series_wins, 0) DESC, gt.sort_order, a.team_name
    )::int AS place,
    a.team_name,
    COALESCE(r.games, 0)::int AS games,
    COALESCE(r.series_wins, 0)::int AS series_wins,
    COALESCE(r.maps_won, 0)::int AS maps_won,
    COALESCE(r.maps_lost, 0)::int AS maps_lost
  FROM tournament_groups g
  JOIN tournament_group_teams gt ON gt.group_id = g.id
  JOIN tournament_team_applications a ON a.id = gt.application_id
  LEFT JOIN team_results r
    ON r.group_id = gt.group_id AND r.application_id = gt.application_id
  WHERE g.tournament_id = $1
  ORDER BY g.sort_order, place
`;
