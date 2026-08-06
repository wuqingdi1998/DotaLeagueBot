CREATE TABLE IF NOT EXISTS compendium_star_race_quest_completions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    moscow_date DATE NOT NULL
        CHECK (moscow_date BETWEEN DATE '2026-08-10' AND DATE '2026-08-16'),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reward_amount SMALLINT NOT NULL DEFAULT 2 CHECK (reward_amount = 2),
    UNIQUE (player_id, moscow_date),
    UNIQUE (id, player_id)
);

CREATE TABLE IF NOT EXISTS compendium_star_race_quest_wins (
    completion_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 2),
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    matched_match_id BIGINT NOT NULL CHECK (matched_match_id > 0),
    PRIMARY KEY (completion_id, position),
    UNIQUE (completion_id, hero_id),
    UNIQUE (player_id, matched_match_id),
    FOREIGN KEY (completion_id, player_id)
        REFERENCES compendium_star_race_quest_completions(id, player_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS compendium_star_race_completion_player_idx
    ON compendium_star_race_quest_completions(player_id, completed_at DESC);

CREATE OR REPLACE VIEW compendium_star_events AS
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
    rune.player_id,
    rune.reward_amount::int,
    rune.completed_at
FROM compendium_rune_challenge_completions rune
UNION ALL
SELECT
    race.player_id,
    race.reward_amount::int,
    race.completed_at
FROM compendium_star_race_quest_completions race;

CREATE OR REPLACE VIEW compendium_player_star_totals AS
SELECT
    player.discord_id AS player_id,
    GREATEST(0, COALESCE(stars.total, 0))::int AS total_stars
FROM players player
LEFT JOIN (
    SELECT event.player_id, SUM(event.amount)::int AS total
    FROM compendium_star_events event
    GROUP BY event.player_id
) stars ON stars.player_id = player.discord_id;

DROP TRIGGER IF EXISTS compendium_star_race_profile_badges_trigger
    ON compendium_star_race_quest_completions;
CREATE TRIGGER compendium_star_race_profile_badges_trigger
AFTER INSERT OR UPDATE OF reward_amount
ON compendium_star_race_quest_completions
FOR EACH ROW
EXECUTE FUNCTION grant_ti_2026_profile_badges_after_change();
