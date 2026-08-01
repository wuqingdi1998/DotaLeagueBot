ALTER TABLE players
    ADD COLUMN IF NOT EXISTS tier_status VARCHAR(12) NOT NULL DEFAULT 'current';

DO $$
BEGIN
    ALTER TABLE players
        ADD CONSTRAINT players_tier_status_valid
        CHECK (tier_status IN ('current', 'outdated', 'inactive'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS players_titan_checkup_idx
    ON players(tier_status, internal_rating)
    WHERE is_archived = FALSE;

CREATE TABLE IF NOT EXISTS titan_checkup_requests (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    requested_by BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'created'
        CHECK (status IN (
            'created', 'sent', 'ready', 'submitted', 'later', 'inactive',
            'expired', 'replaced', 'delivery_failed'
        )),
    dm_message_id BIGINT UNIQUE,
    forwarded_message_id BIGINT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ready_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS titan_checkup_open_player_idx
    ON titan_checkup_requests(player_id)
    WHERE status IN ('created', 'sent', 'ready');

CREATE INDEX IF NOT EXISTS titan_checkup_expiry_idx
    ON titan_checkup_requests(expires_at, id)
    WHERE status = 'ready';
