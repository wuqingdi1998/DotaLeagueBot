CREATE TABLE IF NOT EXISTS compendium_star_race_tiebreak_rolls (
    race_start_at TIMESTAMPTZ NOT NULL,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    rolls SMALLINT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (race_start_at, player_id),
    CHECK (cardinality(rolls) = 64)
);
