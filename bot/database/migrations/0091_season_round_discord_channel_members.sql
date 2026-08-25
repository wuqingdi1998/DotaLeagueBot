CREATE TABLE IF NOT EXISTS season_round_discord_channel_members (
    round_id BIGINT NOT NULL
        REFERENCES season_rounds(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL
        REFERENCES players(discord_id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (round_id, player_id)
);

INSERT INTO season_round_discord_channel_members (round_id, player_id)
SELECT registration.round_id, registration.player_id
FROM season_round_registrations registration
JOIN season_rounds round ON round.id = registration.round_id
WHERE round.discord_channel_id IS NOT NULL
ON CONFLICT (round_id, player_id) DO NOTHING;
