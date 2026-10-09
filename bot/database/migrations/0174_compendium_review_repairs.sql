CREATE OR REPLACE VIEW compendium_star_race_events AS
SELECT operation.player_id, operation.amount, operation.earned_at
FROM october_compendium_reward_operations operation
WHERE compendium_stars_count_for_player(operation.player_id, operation.earned_at)
  AND CASE operation.history_kind
      WHEN 'quest' THEN EXISTS (
          SELECT 1 FROM compendium_user_quest_completions completion
          JOIN compendium_daily_quests quest ON quest.id = completion.daily_quest_id
          WHERE completion.id::text = operation.completion_id AND quest.position BETWEEN 1 AND 3
      )
      WHEN 'star_race' THEN TRUE
      WHEN 'clan_outing' THEN TRUE
      WHEN 'admin' THEN operation.earned_at >= TIMESTAMPTZ '2026-10-12 00:00:00+03' AND EXISTS (
          SELECT 1 FROM compendium_admin_star_adjustments adjustment
          WHERE adjustment.id::text = operation.completion_id AND adjustment.is_star_race_eligible
      )
      WHEN 'prediction' THEN operation.earned_at >= TIMESTAMPTZ '2026-10-12 00:00:00+03'
      ELSE FALSE
  END;

-- Keep archived results independent of the currently active star views.
CREATE VIEW ti_2026_compendium_reward_operations AS
WITH operations AS (
    SELECT completion.player_id, 'quest'::text AS history_kind, completion.id::text AS completion_id, completion.reward_amount::int AS amount,
           completion.completed_at AS earned_at, quest_set.moscow_date,
           quest.position <> 4 AS is_star_race_eligible
    FROM compendium_user_quest_completions completion
    JOIN compendium_daily_quests quest ON quest.id = completion.daily_quest_id
    JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
    UNION ALL
    SELECT player_id, 'admin', id::text, amount::int, created_at,
           (created_at AT TIME ZONE 'Europe/Moscow')::date, is_star_race_eligible
    FROM compendium_admin_star_adjustments
    UNION ALL
    SELECT reward.player_id, 'prediction', reward.match_id::text, reward.reward_amount::int, reward.awarded_at, match.moscow_date, TRUE
    FROM compendium_prediction_rewards reward JOIN compendium_prediction_matches match ON match.id = reward.match_id
    UNION ALL
    SELECT player_id, 'rune', id::text, reward_amount::int, completed_at, moscow_date, FALSE
    FROM compendium_rune_challenge_completions
    UNION ALL
    SELECT player_id, 'star_race', id::text, reward_amount::int, completed_at, moscow_date, TRUE
    FROM compendium_star_race_quest_completions
)
SELECT * FROM operations
WHERE moscow_date < DATE '2026-08-24' AND earned_at < TIMESTAMPTZ '2026-08-24 00:00:00+03';

CREATE VIEW ti_2026_compendium_player_star_totals AS
SELECT player_id, GREATEST(0, SUM(amount))::int AS total_stars
FROM ti_2026_compendium_reward_operations GROUP BY player_id;

CREATE VIEW ti_2026_compendium_star_race_events AS
SELECT player_id, amount, earned_at FROM ti_2026_compendium_reward_operations WHERE is_star_race_eligible;

ALTER TABLE compendium_admin_star_adjustments ADD COLUMN reason VARCHAR(500);
ALTER TABLE compendium_star_race_quest_completions ADD COLUMN evidence_retry_after TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION grant_ti_2026_profile_badges_after_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF CURRENT_TIMESTAMP < TIMESTAMPTZ '2026-08-24 00:00:00+03' THEN
        PERFORM grant_ti_2026_profile_badges(NEW.player_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION allow_october_admin_star_adjustment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF CURRENT_TIMESTAMP < TIMESTAMPTZ '2026-10-05 00:00:00+03'
       OR CURRENT_TIMESTAMP >= TIMESTAMPTZ '2026-10-26 00:00:00+03'
       OR (TG_OP <> 'INSERT' AND (OLD.created_at < TIMESTAMPTZ '2026-10-05 00:00:00+03'
            OR OLD.created_at >= TIMESTAMPTZ '2026-10-26 00:00:00+03'))
       OR (TG_OP <> 'DELETE' AND (NEW.created_at < TIMESTAMPTZ '2026-10-05 00:00:00+03'
            OR NEW.created_at >= TIMESTAMPTZ '2026-10-26 00:00:00+03')) THEN
        RAISE EXCEPTION 'Compendium adjustment is outside the active October period' USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NOT EXISTS (SELECT 1 FROM october_compendium_clan_members WHERE player_id = NEW.player_id)
       OR NOT compendium_stars_count_for_player(NEW.player_id, NEW.created_at) THEN
        RAISE EXCEPTION 'Player is not an active October participant' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS freeze_ti_2026_compendium ON compendium_admin_star_adjustments;
CREATE TRIGGER freeze_ti_2026_compendium BEFORE INSERT OR UPDATE OR DELETE
ON compendium_admin_star_adjustments FOR EACH ROW EXECUTE FUNCTION allow_october_admin_star_adjustment();
