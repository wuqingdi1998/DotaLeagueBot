ALTER TABLE compendium_prediction_matches
    DROP CONSTRAINT IF EXISTS compendium_prediction_matches_actual_score_check;

ALTER TABLE compendium_prediction_matches
    ADD CONSTRAINT compendium_prediction_matches_actual_score_check
    CHECK (actual_score IN (
        '2:0', '2:1', '1:2', '0:2',
        '3:0', '3:1', '3:2', '2:3', '1:3', '0:3'
    ));

ALTER TABLE compendium_prediction_picks
    DROP CONSTRAINT IF EXISTS compendium_prediction_picks_predicted_score_check;

ALTER TABLE compendium_prediction_picks
    ADD CONSTRAINT compendium_prediction_picks_predicted_score_check
    CHECK (predicted_score IN (
        '2:0', '2:1', '1:2', '0:2',
        '3:0', '3:1', '3:2', '2:3', '1:3', '0:3'
    ));

ALTER TABLE compendium_prediction_rewards
    DROP CONSTRAINT IF EXISTS compendium_prediction_rewards_reward_amount_check;

ALTER TABLE compendium_prediction_rewards
    ADD CONSTRAINT compendium_prediction_rewards_reward_amount_check
    CHECK (reward_amount BETWEEN 0 AND 100);

ALTER TABLE compendium_prediction_matches
    ADD COLUMN wins_required SMALLINT NOT NULL DEFAULT 2
        CHECK (wins_required IN (2, 3)),
    ADD COLUMN exact_score_reward SMALLINT NOT NULL DEFAULT 2
        CHECK (exact_score_reward BETWEEN 1 AND 100),
    ADD COLUMN outcome_reward SMALLINT NOT NULL DEFAULT 1
        CHECK (outcome_reward BETWEEN 0 AND 100),
    ADD CONSTRAINT compendium_prediction_matches_reward_order_check
        CHECK (outcome_reward <= exact_score_reward);

WITH target_match AS (
    SELECT id
    FROM compendium_prediction_matches
    WHERE moscow_date = DATE '2026-08-22'
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
WHERE moscow_date = DATE '2026-08-22'
  AND team_a_key = 'tbd'
  AND team_b_key = 'team-vision';
