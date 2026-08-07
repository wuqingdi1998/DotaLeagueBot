CREATE TABLE IF NOT EXISTS compendium_star_race_quest_progress (
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    moscow_date DATE NOT NULL
        CHECK (moscow_date BETWEEN DATE '2026-08-10' AND DATE '2026-08-16'),
    progress_amount BIGINT NOT NULL DEFAULT 0 CHECK (progress_amount >= 0),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, moscow_date)
);

CREATE INDEX IF NOT EXISTS compendium_star_race_progress_checked_idx
    ON compendium_star_race_quest_progress(checked_at DESC);
