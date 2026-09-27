CREATE TABLE IF NOT EXISTS october_compendium_clan_members (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    clan_id VARCHAR(16) NOT NULL CHECK (clan_id IN ('morbus', 'panacea')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH ranked_players AS (
    SELECT
        player.discord_id,
        ROW_NUMBER() OVER (
            ORDER BY
                COALESCE(NULLIF(player.internal_rating, 0), 0) DESC,
                COALESCE(player.rank_tier, 0) DESC,
                MD5(player.discord_id::text || ':october-2026')
        ) AS seed_position
    FROM players player
    WHERE player.is_archived = FALSE
)
INSERT INTO october_compendium_clan_members (player_id, clan_id)
SELECT
    ranked_player.discord_id,
    CASE
        WHEN MOD(ranked_player.seed_position - 1, 4) IN (0, 3) THEN 'morbus'
        ELSE 'panacea'
    END
FROM ranked_players ranked_player
ON CONFLICT (player_id) DO NOTHING;
