ALTER TABLE season_rounds
    ADD COLUMN IF NOT EXISTS discord_channel_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS season_rounds_discord_channel_unique
    ON season_rounds(discord_channel_id)
    WHERE discord_channel_id IS NOT NULL;
