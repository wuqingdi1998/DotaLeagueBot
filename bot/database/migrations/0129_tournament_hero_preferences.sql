CREATE TABLE IF NOT EXISTS tournament_hero_preferences (
    tournament_id BIGINT NOT NULL
        REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL
        REFERENCES players(discord_id) ON DELETE CASCADE,
    is_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tournament_id, player_id)
);
