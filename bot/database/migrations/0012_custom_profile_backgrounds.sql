ALTER TABLE player_profile_preferences
    ADD COLUMN IF NOT EXISTS custom_background_key VARCHAR(96);
