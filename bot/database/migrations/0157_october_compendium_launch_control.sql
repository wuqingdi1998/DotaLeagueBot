ALTER TABLE october_compendium_clan_formation
    DROP CONSTRAINT IF EXISTS october_compendium_clan_formation_status_check;

ALTER TABLE october_compendium_clan_formation
    ADD CONSTRAINT october_compendium_clan_formation_status_check CHECK (
        status IN (
            'pending', 'preparing', 'review', 'approved', 'cancelled',
            'publishing', 'complete', 'failed'
        )
    ),
    ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS decided_by BIGINT REFERENCES players(discord_id)
        ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS october_compendium_clan_assignment_drafts (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    clan_id VARCHAR(16) NOT NULL CHECK (clan_id IN ('morbus', 'panacea')),
    assignment_source VARCHAR(16) NOT NULL
        CHECK (assignment_source IN ('reservation', 'automatic')),
    activity_score NUMERIC(12, 3) NOT NULL DEFAULT 0,
    decision_order INTEGER NOT NULL CHECK (decision_order > 0),
    decision_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS october_compendium_launch_review_notification_unique
    ON notification_outbox(discord_id, event_type)
    WHERE event_type = 'october_compendium_launch_review';

DELETE FROM october_compendium_clan_assignment_drafts;
DELETE FROM october_compendium_clan_activity;
DELETE FROM october_compendium_clan_members;

UPDATE october_compendium_clan_formation
SET status = 'pending',
    attempts = 0,
    started_at = NULL,
    prepared_at = NULL,
    decision_at = NULL,
    decided_by = NULL,
    completed_at = NULL,
    error_message = NULL,
    updated_at = NOW()
WHERE singleton = TRUE;
