ALTER TABLE compendium_admin_star_adjustments
ADD COLUMN IF NOT EXISTS is_star_race_eligible BOOLEAN NOT NULL DEFAULT TRUE;

WITH corrected(id, amount) AS (
    VALUES
        (26::BIGINT, 4::SMALLINT), -- reality
        (27::BIGINT, 4::SMALLINT), -- evo
        (28::BIGINT, 4::SMALLINT), -- Shima~
        (29::BIGINT, 4::SMALLINT), -- Pancake
        (30::BIGINT, 4::SMALLINT), -- jamsfedya
        (31::BIGINT, 3::SMALLINT), -- Ame's bastard
        (32::BIGINT, 3::SMALLINT), -- confuse
        (34::BIGINT, 3::SMALLINT), -- N4ZE
        (36::BIGINT, 3::SMALLINT), -- Sanraizu
        (37::BIGINT, 3::SMALLINT), -- Immersion
        (38::BIGINT, 2::SMALLINT), -- yupiii
        (39::BIGINT, 2::SMALLINT), -- .flowerZ
        (40::BIGINT, 2::SMALLINT), -- Wuqing
        (41::BIGINT, 2::SMALLINT), -- ПОДПИВАС
        (42::BIGINT, 2::SMALLINT), -- Linkovatel
        (43::BIGINT, 1::SMALLINT), -- Mazadox
        (44::BIGINT, 1::SMALLINT), -- DiroJu
        (45::BIGINT, 1::SMALLINT), -- frokeng
        (46::BIGINT, 1::SMALLINT), -- ДЕД_ЕСЕНИН
        (47::BIGINT, 1::SMALLINT)  -- .Purvs
)
UPDATE compendium_admin_star_adjustments adjustment
SET is_star_race_eligible = FALSE
FROM corrected
WHERE adjustment.id = corrected.id
  AND adjustment.amount = corrected.amount
  AND adjustment.administrator_name = 'frokeng'
  AND adjustment.created_at >= TIMESTAMPTZ '2026-08-17 20:09:00+03'
  AND adjustment.created_at < TIMESTAMPTZ '2026-08-17 20:17:00+03';

CREATE OR REPLACE VIEW compendium_star_race_events AS
SELECT
    completion.player_id,
    completion.reward_amount::int AS amount,
    completion.completed_at AS earned_at
FROM compendium_user_quest_completions completion
JOIN compendium_daily_quests daily_quest
    ON daily_quest.id = completion.daily_quest_id
WHERE daily_quest.position <> 4
UNION ALL
SELECT
    adjustment.player_id,
    adjustment.amount::int,
    adjustment.created_at
FROM compendium_admin_star_adjustments adjustment
WHERE adjustment.is_star_race_eligible = TRUE
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
