CREATE TABLE IF NOT EXISTS site_runtime_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    is_break_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT REFERENCES players(discord_id) ON DELETE SET NULL
);

INSERT INTO site_runtime_settings (id, is_break_enabled)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;
