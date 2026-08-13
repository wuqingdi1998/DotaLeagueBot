CREATE INDEX IF NOT EXISTS web_sessions_latest_avatar_idx
    ON web_sessions(discord_id, created_at DESC)
    WHERE discord_avatar_url IS NOT NULL;

CREATE TABLE IF NOT EXISTS compendium_star_race_standings_snapshots (
    race_start_at TIMESTAMPTZ PRIMARY KEY,
    participants JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (jsonb_typeof(participants) = 'array')
);
