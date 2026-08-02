CREATE TABLE IF NOT EXISTS compendium_admin_star_adjustments (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    amount SMALLINT NOT NULL CHECK (amount BETWEEN -10000 AND 10000 AND amount <> 0),
    administered_by BIGINT NOT NULL,
    administrator_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS compendium_admin_stars_player_idx
    ON compendium_admin_star_adjustments(player_id, created_at DESC, id DESC);

CREATE VIEW compendium_player_star_totals AS
SELECT
    player.discord_id AS player_id,
    GREATEST(
        0,
        COALESCE(completion.total, 0) + COALESCE(adjustment.total, 0)
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
) adjustment ON TRUE;
