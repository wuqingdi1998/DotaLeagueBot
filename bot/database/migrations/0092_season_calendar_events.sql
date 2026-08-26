CREATE TABLE season_calendar_events (
    id BIGSERIAL PRIMARY KEY,
    season_number SMALLINT NOT NULL
        CHECK (season_number BETWEEN 1 AND 99),
    event_date DATE NOT NULL,
    title VARCHAR(80) NOT NULL
        CHECK (LENGTH(TRIM(title)) BETWEEN 1 AND 80),
    color CHAR(7) NOT NULL
        CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_by BIGINT
        REFERENCES players(discord_id) ON DELETE SET NULL,
    updated_by BIGINT
        REFERENCES players(discord_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX season_calendar_events_season_date_idx
    ON season_calendar_events(season_number, event_date, id);
