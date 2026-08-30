ALTER TABLE season_match_substitutions
    ADD COLUMN IF NOT EXISTS penalty_event_id BIGINT
        REFERENCES season_penalty_events(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS penalty_fire_count SMALLINT NOT NULL DEFAULT 0
        CHECK (penalty_fire_count BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS season_match_substitutions_penalty_idx
    ON season_match_substitutions(penalty_event_id)
    WHERE penalty_event_id IS NOT NULL;
