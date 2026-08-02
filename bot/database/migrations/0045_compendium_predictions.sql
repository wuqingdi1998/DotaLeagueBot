CREATE TABLE IF NOT EXISTS compendium_prediction_matches (
    id BIGSERIAL PRIMARY KEY,
    moscow_date DATE NOT NULL,
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
    starts_at TIMESTAMPTZ NOT NULL,
    team_a_key VARCHAR(80) NOT NULL,
    team_a_name VARCHAR(120) NOT NULL,
    team_a_logo_path TEXT NOT NULL,
    team_b_key VARCHAR(80) NOT NULL,
    team_b_name VARCHAR(120) NOT NULL,
    team_b_logo_path TEXT NOT NULL,
    actual_score VARCHAR(3) CHECK (actual_score IN ('2:0', '2:1', '1:2', '0:2')),
    configured_by BIGINT NOT NULL REFERENCES players(discord_id),
    result_recorded_by BIGINT REFERENCES players(discord_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (moscow_date, position),
    CHECK (team_a_key <> team_b_key),
    CHECK ((starts_at AT TIME ZONE 'Europe/Moscow')::date = moscow_date)
);

CREATE INDEX IF NOT EXISTS compendium_prediction_matches_date_idx
    ON compendium_prediction_matches(moscow_date, starts_at, position);

CREATE TABLE IF NOT EXISTS compendium_prediction_picks (
    match_id BIGINT NOT NULL
        REFERENCES compendium_prediction_matches(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    predicted_score VARCHAR(3) NOT NULL
        CHECK (predicted_score IN ('2:0', '2:1', '1:2', '0:2')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS compendium_prediction_rewards (
    match_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    reward_amount SMALLINT NOT NULL CHECK (reward_amount BETWEEN 0 AND 2),
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, player_id),
    FOREIGN KEY (match_id, player_id)
        REFERENCES compendium_prediction_picks(match_id, player_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS compendium_prediction_rewards_player_idx
    ON compendium_prediction_rewards(player_id, awarded_at DESC);

CREATE OR REPLACE VIEW compendium_player_star_totals AS
SELECT
    player.discord_id AS player_id,
    GREATEST(
        0,
        COALESCE(completion.total, 0)
        + COALESCE(adjustment.total, 0)
        + COALESCE(prediction.total, 0)
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
) prediction ON TRUE;

DROP TRIGGER IF EXISTS compendium_prediction_profile_badges_trigger
    ON compendium_prediction_rewards;
CREATE TRIGGER compendium_prediction_profile_badges_trigger
AFTER INSERT OR UPDATE OF reward_amount ON compendium_prediction_rewards
FOR EACH ROW
EXECUTE FUNCTION grant_ti_2026_profile_badges_after_change();

