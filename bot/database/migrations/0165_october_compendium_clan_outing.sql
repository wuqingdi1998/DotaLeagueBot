CREATE TABLE IF NOT EXISTS october_compendium_clan_outing_completions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    partner_player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    moscow_date DATE NOT NULL CHECK (
        moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25'
    ),
    matched_match_id BIGINT NOT NULL CHECK (matched_match_id > 0),
    reward_amount SMALLINT NOT NULL CHECK (reward_amount IN (1, 2)),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, moscow_date),
    CHECK (player_id <> partner_player_id)
);

CREATE INDEX IF NOT EXISTS october_clan_outing_player_history_idx
    ON october_compendium_clan_outing_completions(player_id, completed_at DESC);

CREATE OR REPLACE VIEW compendium_star_events AS
SELECT player_id, reward_amount::int AS amount, completed_at AS earned_at
FROM compendium_user_quest_completions
UNION ALL
SELECT player_id, amount::int, created_at FROM compendium_admin_star_adjustments
UNION ALL
SELECT player_id, reward_amount::int, awarded_at FROM compendium_prediction_rewards
UNION ALL
SELECT player_id, reward_amount::int, completed_at FROM compendium_rune_challenge_completions
UNION ALL
SELECT player_id, reward_amount::int, completed_at FROM compendium_star_race_quest_completions
UNION ALL
SELECT player_id, reward_amount::int, completed_at
FROM october_compendium_clan_outing_completions;

CREATE OR REPLACE VIEW compendium_player_star_totals AS
SELECT player.discord_id AS player_id,
       GREATEST(0, COALESCE(stars.total, 0))::int AS total_stars
FROM players player
LEFT JOIN (
    SELECT event.player_id, SUM(event.amount)::int AS total
    FROM compendium_star_events event
    GROUP BY event.player_id
) stars ON stars.player_id = player.discord_id;
