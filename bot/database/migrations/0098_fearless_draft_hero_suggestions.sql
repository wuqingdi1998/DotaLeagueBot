CREATE TABLE IF NOT EXISTS draft_hero_suggestions (
    map_id BIGINT NOT NULL REFERENCES draft_maps(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    hero_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (map_id, player_id, hero_id)
);

CREATE INDEX IF NOT EXISTS draft_hero_suggestions_map_idx
    ON draft_hero_suggestions(map_id, created_at);
