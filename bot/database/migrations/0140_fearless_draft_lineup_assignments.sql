ALTER TABLE draft_maps
    DROP CONSTRAINT IF EXISTS draft_maps_status_check;
ALTER TABLE draft_maps
    ADD CONSTRAINT draft_maps_status_check CHECK (status IN (
        'FIRST_DECISION', 'SECOND_DECISION', 'DRAFTING',
        'LINEUP_ASSIGNMENT', 'COMPLETE'
    ));

CREATE TABLE IF NOT EXISTS draft_lineup_assignments (
    map_id BIGINT NOT NULL REFERENCES draft_maps(id) ON DELETE CASCADE,
    captain_id BIGINT NOT NULL REFERENCES players(discord_id),
    hero_id INTEGER NOT NULL,
    player_id BIGINT NOT NULL REFERENCES players(discord_id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (map_id, captain_id, hero_id),
    UNIQUE (map_id, captain_id, player_id)
);

CREATE INDEX IF NOT EXISTS draft_lineup_assignments_map_idx
    ON draft_lineup_assignments(map_id, captain_id);
