CREATE TABLE IF NOT EXISTS trusted_organizers (
    discord_id BIGINT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO trusted_organizers(discord_id)
VALUES (311247030422863882)
ON CONFLICT (discord_id) DO NOTHING;
