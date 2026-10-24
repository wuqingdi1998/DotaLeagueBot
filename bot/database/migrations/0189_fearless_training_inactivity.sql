ALTER TABLE draft_series
    ADD COLUMN IF NOT EXISTS last_human_action_at TIMESTAMPTZ;

-- Existing sessions retain their latest activity instead of receiving a new lease.
UPDATE draft_series
SET last_human_action_at = updated_at
WHERE last_human_action_at IS NULL;

ALTER TABLE draft_series
    ALTER COLUMN last_human_action_at SET DEFAULT NOW(),
    ALTER COLUMN last_human_action_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS draft_series_training_inactivity_idx
    ON draft_series(last_human_action_at)
    WHERE season_match_id IS NULL
      AND status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE');
