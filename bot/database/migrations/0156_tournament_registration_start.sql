ALTER TABLE tournaments
    ADD COLUMN registration_starts_at TIMESTAMPTZ;

ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_registration_start_before_deadline_check
    CHECK (
        registration_starts_at IS NULL
        OR registration_starts_at < registration_deadline
    );

CREATE INDEX tournaments_planned_registration_start_idx
    ON tournaments (registration_starts_at)
    WHERE status = 'planned' AND registration_starts_at IS NOT NULL;
