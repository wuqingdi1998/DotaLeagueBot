CREATE TABLE IF NOT EXISTS compendium_star_race_arcana_checks (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    moscow_date DATE NOT NULL,
    match_id BIGINT NOT NULL CHECK (match_id > 0),
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    opendota_job_id TEXT,
    check_after TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    has_arcana BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, moscow_date, match_id),
    CHECK (
        (finished_at IS NULL AND has_arcana IS NULL)
        OR (finished_at IS NOT NULL AND has_arcana IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS compendium_star_race_arcana_due_idx
    ON compendium_star_race_arcana_checks(check_after)
    WHERE finished_at IS NULL;
