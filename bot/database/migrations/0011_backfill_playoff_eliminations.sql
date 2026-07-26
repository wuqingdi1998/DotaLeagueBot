UPDATE tournament_matches
SET eliminated_team_application_id = CASE
    WHEN LOWER(COALESCE(team_a_result_label, '')) = 'tl'
      OR LOWER(COALESCE(team_b_result_label, '')) = 'tw'
        THEN team_a_application_id
    WHEN LOWER(COALESCE(team_b_result_label, '')) = 'tl'
      OR LOWER(COALESCE(team_a_result_label, '')) = 'tw'
        THEN team_b_application_id
    WHEN team_a_score < team_b_score THEN team_a_application_id
    WHEN team_b_score < team_a_score THEN team_b_application_id
    ELSE NULL
END
WHERE status = 'finished'
  AND bracket_side IN ('lower', 'grand_final')
  AND loser_to_match_id IS NULL
  AND eliminated_team_application_id IS NULL;
