ALTER TABLE player_profile_preferences
    ADD COLUMN IF NOT EXISTS should_hide_archived_tournaments BOOLEAN NOT NULL DEFAULT FALSE;
