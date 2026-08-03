CREATE TABLE IF NOT EXISTS compendium_rune_challenge_selections (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compendium_rune_challenge_completions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    moscow_date DATE NOT NULL,
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    matched_match_id BIGINT NOT NULL CHECK (matched_match_id > 0),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reward_amount SMALLINT NOT NULL DEFAULT 1 CHECK (reward_amount = 1),
    UNIQUE (player_id, moscow_date),
    UNIQUE (player_id, matched_match_id)
);

CREATE INDEX IF NOT EXISTS compendium_rune_completions_player_idx
    ON compendium_rune_challenge_completions(player_id, completed_at DESC);

CREATE OR REPLACE VIEW compendium_player_star_totals AS
SELECT
    player.discord_id AS player_id,
    GREATEST(
        0,
        COALESCE(completion.total, 0)
        + COALESCE(adjustment.total, 0)
        + COALESCE(prediction.total, 0)
        + COALESCE(rune_challenge.total, 0)
    )::int AS total_stars
FROM players player
LEFT JOIN LATERAL (
    SELECT SUM(reward_amount)::int AS total
    FROM compendium_user_quest_completions
    WHERE player_id = player.discord_id
) completion ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(amount)::int AS total
    FROM compendium_admin_star_adjustments
    WHERE player_id = player.discord_id
) adjustment ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(reward_amount)::int AS total
    FROM compendium_prediction_rewards
    WHERE player_id = player.discord_id
) prediction ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(reward_amount)::int AS total
    FROM compendium_rune_challenge_completions
    WHERE player_id = player.discord_id
) rune_challenge ON TRUE;

DROP TRIGGER IF EXISTS compendium_rune_profile_badges_trigger
    ON compendium_rune_challenge_completions;
CREATE TRIGGER compendium_rune_profile_badges_trigger
AFTER INSERT OR UPDATE OF reward_amount ON compendium_rune_challenge_completions
FOR EACH ROW
EXECUTE FUNCTION grant_ti_2026_profile_badges_after_change();
