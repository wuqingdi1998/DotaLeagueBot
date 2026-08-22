DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM compendium_prediction_matches
        WHERE moscow_date = DATE '2026-08-23'
    ) AND NOT EXISTS (
        SELECT 1
        FROM compendium_prediction_matches
        WHERE moscow_date = DATE '2026-08-23'
          AND team_a_key = 'tbd'
          AND team_b_key = 'team-vision'
    ) THEN
        RAISE EXCEPTION 'TBD versus TEAM VISION prediction was not found on 2026-08-23';
    END IF;
END
$$;

WITH target_match AS (
    SELECT id
    FROM compendium_prediction_matches
    WHERE moscow_date = DATE '2026-08-23'
      AND team_a_key = 'tbd'
      AND team_b_key = 'team-vision'
)
UPDATE compendium_prediction_picks
SET predicted_score = CASE predicted_score
    WHEN '2:0' THEN '3:0'
    WHEN '2:1' THEN '3:1'
    WHEN '1:2' THEN '1:3'
    WHEN '0:2' THEN '0:3'
    ELSE predicted_score
END,
updated_at = NOW()
WHERE match_id IN (SELECT id FROM target_match);

UPDATE compendium_prediction_matches
SET wins_required = 3,
    exact_score_reward = 5,
    outcome_reward = 3,
    updated_at = NOW()
WHERE moscow_date = DATE '2026-08-23'
  AND team_a_key = 'tbd'
  AND team_b_key = 'team-vision';
