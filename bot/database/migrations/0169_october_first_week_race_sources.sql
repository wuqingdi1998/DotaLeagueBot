CREATE OR REPLACE VIEW compendium_star_race_events AS
WITH first_week AS (
    SELECT TIMESTAMPTZ '2026-10-05 00:00:00+03' AS starts_at,
           TIMESTAMPTZ '2026-10-12 00:00:00+03' AS ends_at
), events AS (
    SELECT completion.player_id, completion.reward_amount::int AS amount,
           completion.completed_at AS earned_at,
           quest.position BETWEEN 1 AND 3 AS is_first_week_eligible,
           FALSE AS is_clan_outing
    FROM compendium_user_quest_completions completion
    JOIN compendium_daily_quests quest ON quest.id = completion.daily_quest_id
    WHERE quest.position <> 4
    UNION ALL
    SELECT player_id, amount::int, created_at, FALSE, FALSE
    FROM compendium_admin_star_adjustments WHERE is_star_race_eligible = TRUE
    UNION ALL
    SELECT player_id, reward_amount::int, awarded_at, FALSE, FALSE
    FROM compendium_prediction_rewards
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at, TRUE, FALSE
    FROM compendium_star_race_quest_completions
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at, TRUE, TRUE
    FROM october_compendium_clan_outing_completions
)
SELECT event.player_id, event.amount, event.earned_at
FROM events event CROSS JOIN first_week week
WHERE compendium_stars_count_for_player(event.player_id, event.earned_at)
  AND CASE
      WHEN event.earned_at >= week.starts_at AND event.earned_at < week.ends_at
          THEN event.is_first_week_eligible
      ELSE NOT event.is_clan_outing
  END;
