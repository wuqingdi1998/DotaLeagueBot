CREATE TABLE IF NOT EXISTS season_ranked_win_checks (
    player_id BIGINT PRIMARY KEY
        REFERENCES players(discord_id) ON DELETE CASCADE,
    primary_role SMALLINT NOT NULL CHECK (primary_role BETWEEN 1 AND 5),
    secondary_role SMALLINT NOT NULL CHECK (secondary_role BETWEEN 1 AND 5),
    primary_wins SMALLINT NOT NULL CHECK (primary_wins >= 0),
    secondary_wins SMALLINT NOT NULL CHECK (secondary_wins >= 0),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS season_ranked_win_checks_checked_at_idx
    ON season_ranked_win_checks(checked_at);
