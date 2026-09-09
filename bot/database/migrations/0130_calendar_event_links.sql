ALTER TABLE season_calendar_events
    ADD COLUMN link_url VARCHAR(2048);

ALTER TABLE season_calendar_events
    ADD CONSTRAINT season_calendar_events_link_url_valid
    CHECK (
        link_url IS NULL
        OR link_url ~* '^https?://[^[:space:]]+$'
    );
