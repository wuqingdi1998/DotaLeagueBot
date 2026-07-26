ALTER TABLE close_events
    ADD COLUMN IF NOT EXISTS participant_joined_at TEXT NOT NULL DEFAULT '';
