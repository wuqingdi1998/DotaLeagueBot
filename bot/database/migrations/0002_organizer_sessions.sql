CREATE TABLE IF NOT EXISTS web_organizer_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    discord_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS web_organizer_sessions_expiry_idx
    ON web_organizer_sessions(expires_at);

CREATE TABLE IF NOT EXISTS web_organizer_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    discord_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS web_organizer_login_attempts_recent_idx
    ON web_organizer_login_attempts(discord_id, attempted_at DESC);
