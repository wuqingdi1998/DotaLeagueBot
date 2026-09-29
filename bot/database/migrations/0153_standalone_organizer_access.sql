ALTER TABLE web_organizer_sessions
    ALTER COLUMN discord_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS session_kind VARCHAR(16) NOT NULL DEFAULT 'player',
    ADD COLUMN IF NOT EXISTS role VARCHAR(24) NOT NULL DEFAULT 'organizer';

ALTER TABLE web_organizer_sessions
    DROP CONSTRAINT IF EXISTS web_organizer_sessions_kind_check,
    ADD CONSTRAINT web_organizer_sessions_kind_check CHECK (
        (session_kind = 'player' AND discord_id IS NOT NULL)
        OR (session_kind = 'standalone' AND discord_id IS NULL)
    ),
    DROP CONSTRAINT IF EXISTS web_organizer_sessions_role_check,
    ADD CONSTRAINT web_organizer_sessions_role_check CHECK (role = 'organizer');

ALTER TABLE web_organizer_login_attempts
    ALTER COLUMN discord_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS attempt_key VARCHAR(80),
    ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(40),
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(300);

UPDATE web_organizer_login_attempts
SET attempt_key = 'discord:' || discord_id::text
WHERE attempt_key IS NULL;

ALTER TABLE web_organizer_login_attempts
    ALTER COLUMN attempt_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS web_organizer_login_attempts_key_recent_idx
    ON web_organizer_login_attempts(attempt_key, attempted_at DESC);

ALTER TABLE compendium_prediction_matches
    ALTER COLUMN configured_by DROP NOT NULL;

ALTER TABLE compendium_prediction_days
    ALTER COLUMN configured_by DROP NOT NULL;

ALTER TABLE compendium_star_race_final_predictions
    ALTER COLUMN configured_by DROP NOT NULL;

ALTER TABLE compendium_user_quest_completions
    DROP CONSTRAINT IF EXISTS compendium_user_quest_completion_source_check,
    ADD CONSTRAINT compendium_user_quest_completion_source_check CHECK (
        (
            completion_source = 'automatic'
            AND matched_hero_id IS NOT NULL
            AND matched_match_id IS NOT NULL
            AND completed_manually_by IS NULL
        )
        OR (
            completion_source = 'manual'
            AND matched_hero_id IS NULL
            AND matched_match_id IS NULL
        )
    );
