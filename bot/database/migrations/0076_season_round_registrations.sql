CREATE TABLE IF NOT EXISTS season_round_registrations (
    round_id BIGINT NOT NULL
        REFERENCES season_rounds(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL
        REFERENCES players(discord_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (round_id, player_id)
);

CREATE INDEX IF NOT EXISTS season_round_registrations_player_idx
    ON season_round_registrations(player_id, round_id);
