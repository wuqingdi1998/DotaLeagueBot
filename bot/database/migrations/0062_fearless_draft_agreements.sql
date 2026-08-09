ALTER TABLE draft_series
    ADD COLUMN IF NOT EXISTS end_requested_by BIGINT REFERENCES players(discord_id),
    ADD COLUMN IF NOT EXISTS end_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS player1_ready_for_next_map BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS player2_ready_for_next_map BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE draft_series
    DROP CONSTRAINT IF EXISTS draft_series_end_request_participant;
ALTER TABLE draft_series
    ADD CONSTRAINT draft_series_end_request_participant CHECK (
        end_requested_by IS NULL
        OR end_requested_by IN (player1_id, player2_id)
    );

CREATE INDEX IF NOT EXISTS draft_series_end_request_expiry_idx
    ON draft_series(end_requested_at)
    WHERE end_requested_by IS NOT NULL;
