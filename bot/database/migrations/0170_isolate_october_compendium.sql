-- Current rewards are identified by their own challenge date, never by archive totals.
CREATE VIEW october_compendium_reward_operations AS
WITH operations AS (
    SELECT completion.player_id, 'quest'::text AS history_kind,
           completion.id::text AS completion_id, completion.reward_amount::int AS amount,
           completion.completed_at AS earned_at, quest_set.moscow_date
    FROM compendium_user_quest_completions completion
    JOIN compendium_daily_quests quest ON quest.id = completion.daily_quest_id
    JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
    UNION ALL
    SELECT player_id, 'admin', id::text, amount::int, created_at,
           (created_at AT TIME ZONE 'Europe/Moscow')::date
    FROM compendium_admin_star_adjustments
    UNION ALL
    SELECT reward.player_id, 'prediction', reward.match_id::text,
           reward.reward_amount::int, reward.awarded_at, match.moscow_date
    FROM compendium_prediction_rewards reward
    JOIN compendium_prediction_matches match ON match.id = reward.match_id
    UNION ALL
    SELECT player_id, 'rune', id::text, reward_amount::int, completed_at, moscow_date
    FROM october_compendium_rune_challenge_completions
    UNION ALL
    SELECT player_id, 'star_race', id::text, reward_amount::int, completed_at, moscow_date
    FROM compendium_star_race_quest_completions
    UNION ALL
    SELECT player_id, 'clan_outing', id::text, reward_amount::int, completed_at, moscow_date
    FROM october_compendium_clan_outing_completions
)
SELECT * FROM operations
WHERE moscow_date >= DATE '2026-10-05' AND moscow_date < DATE '2026-10-26'
  AND earned_at >= TIMESTAMPTZ '2026-10-05 00:00:00+03'
  AND earned_at < TIMESTAMPTZ '2026-10-26 00:00:00+03';

CREATE OR REPLACE FUNCTION compendium_stars_count_for_player(
    target_player_id BIGINT, event_earned_at TIMESTAMPTZ
)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT event_earned_at >= TIMESTAMPTZ '2026-10-05 00:00:00+03'
       AND event_earned_at < TIMESTAMPTZ '2026-10-26 00:00:00+03'
       AND NOT EXISTS (
           SELECT 1 FROM october_compendium_server_membership presence
           WHERE presence.player_id = target_player_id
             AND (presence.is_present = FALSE OR event_earned_at <= presence.stars_reset_at)
       );
$$;

CREATE OR REPLACE VIEW compendium_star_events AS
SELECT player_id, amount, earned_at
FROM october_compendium_reward_operations
WHERE compendium_stars_count_for_player(player_id, earned_at);

CREATE OR REPLACE VIEW compendium_star_race_events AS
WITH first_week AS (
    SELECT TIMESTAMPTZ '2026-10-12 00:00:00+03' AS ends_at
)
SELECT operation.player_id, operation.amount, operation.earned_at
FROM october_compendium_reward_operations operation CROSS JOIN first_week week
WHERE compendium_stars_count_for_player(operation.player_id, operation.earned_at)
  AND CASE operation.history_kind
      WHEN 'quest' THEN EXISTS (
          SELECT 1 FROM compendium_user_quest_completions completion
          JOIN compendium_daily_quests quest ON quest.id = completion.daily_quest_id
          WHERE completion.id::text = operation.completion_id
            AND CASE WHEN operation.earned_at < week.ends_at
                THEN quest.position BETWEEN 1 AND 3 ELSE quest.position <> 4 END
      )
      WHEN 'star_race' THEN TRUE
      WHEN 'clan_outing' THEN operation.earned_at < week.ends_at
      WHEN 'admin' THEN operation.earned_at >= week.ends_at AND EXISTS (
          SELECT 1 FROM compendium_admin_star_adjustments adjustment
          WHERE adjustment.id::text = operation.completion_id
            AND adjustment.is_star_race_eligible = TRUE
      )
      WHEN 'prediction' THEN operation.earned_at >= week.ends_at
      ELSE FALSE
  END;

-- Previously saved activity must no longer carry stars from another compendium.
UPDATE october_compendium_clan_assignment_drafts draft
SET activity_score = activity.ranked_matches_last_three_months * 2
                   + activity.matches_last_three_months * 0.25
                   + activity.internal_rating / 1000.0 + activity.rank_tier / 10.0,
    decision_reason = CASE WHEN draft.assignment_source = 'reservation'
        THEN draft.decision_reason
        ELSE 'Текущий состав сохранён; балл активности пересчитан без данных прошлого компендиума.' END
FROM october_compendium_clan_activity activity
WHERE activity.player_id = draft.player_id;

UPDATE october_compendium_clan_members member
SET activity_score = draft.activity_score
FROM october_compendium_clan_assignment_drafts draft
WHERE draft.player_id = member.player_id;

ALTER TABLE october_compendium_clan_activity DROP COLUMN previous_compendium_stars;
