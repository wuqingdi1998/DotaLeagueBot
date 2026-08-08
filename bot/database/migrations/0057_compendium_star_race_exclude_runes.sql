CREATE OR REPLACE VIEW compendium_star_race_events AS
SELECT
    completion.player_id,
    completion.reward_amount::int AS amount,
    completion.completed_at AS earned_at
FROM compendium_user_quest_completions completion
UNION ALL
SELECT
    adjustment.player_id,
    adjustment.amount::int,
    adjustment.created_at
FROM compendium_admin_star_adjustments adjustment
UNION ALL
SELECT
    prediction.player_id,
    prediction.reward_amount::int,
    prediction.awarded_at
FROM compendium_prediction_rewards prediction
UNION ALL
SELECT
    race.player_id,
    race.reward_amount::int,
    race.completed_at
FROM compendium_star_race_quest_completions race;
