CREATE TABLE IF NOT EXISTS direct_message_campaigns (
    id BIGSERIAL PRIMARY KEY,
    campaign_key VARCHAR(100) NOT NULL UNIQUE,
    tournament_slug VARCHAR(120) NOT NULL,
    round_number SMALLINT NOT NULL CHECK (round_number > 0),
    scheduled_at TIMESTAMPTZ NOT NULL,
    title VARCHAR(200) NOT NULL,
    registered_message TEXT NOT NULL,
    unregistered_message TEXT NOT NULL,
    report_recipient_id BIGINT NOT NULL,
    batch_size SMALLINT NOT NULL CHECK (batch_size BETWEEN 1 AND 50),
    batch_interval_seconds SMALLINT NOT NULL
        CHECK (batch_interval_seconds BETWEEN 1 AND 300),
    status VARCHAR(16) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'preparing', 'sending', 'completed', 'failed')),
    next_attempt_at TIMESTAMPTZ NOT NULL,
    next_batch_at TIMESTAMPTZ,
    prepared_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    discovered_member_count INTEGER NOT NULL DEFAULT 0,
    skipped_round_registered_count INTEGER NOT NULL DEFAULT 0,
    skipped_bot_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    report_status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (report_status IN ('pending', 'sent', 'failed')),
    report_available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    report_sent_at TIMESTAMPTZ,
    report_attempts SMALLINT NOT NULL DEFAULT 0,
    report_message_id BIGINT,
    report_last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_message_campaign_recipients (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL
        REFERENCES direct_message_campaigns(id) ON DELETE CASCADE,
    discord_id BIGINT NOT NULL,
    audience VARCHAR(16) NOT NULL
        CHECK (audience IN ('registered', 'unregistered')),
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    attempts SMALLINT NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    discord_message_id BIGINT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, discord_id)
);

CREATE INDEX IF NOT EXISTS direct_message_campaigns_due_idx
    ON direct_message_campaigns (scheduled_at, next_attempt_at, id)
    WHERE status IN ('scheduled', 'preparing');

CREATE INDEX IF NOT EXISTS direct_message_campaign_recipients_pending_idx
    ON direct_message_campaign_recipients (campaign_id, available_at, id)
    WHERE status = 'pending';

WITH preview_messages AS (
    SELECT event_type, title, message
    FROM notification_outbox
    WHERE discord_id = 311247030422863882
      AND event_type IN (
        'season_nine_registered_player_preview',
        'season_nine_unregistered_member_preview'
      )
)
INSERT INTO direct_message_campaigns (
    campaign_key,
    tournament_slug,
    round_number,
    scheduled_at,
    title,
    registered_message,
    unregistered_message,
    report_recipient_id,
    batch_size,
    batch_interval_seconds,
    next_attempt_at
)
SELECT
    'season-nine-round-one-outreach',
    'league-season-9',
    1,
    TIMESTAMPTZ '2026-09-05 12:00:00+03',
    MAX(title),
    MAX(message) FILTER (
        WHERE event_type = 'season_nine_registered_player_preview'
    ),
    MAX(message) FILTER (
        WHERE event_type = 'season_nine_unregistered_member_preview'
    ),
    311247030422863882,
    10,
    10,
    TIMESTAMPTZ '2026-09-05 12:00:00+03'
FROM preview_messages
HAVING COUNT(DISTINCT event_type) = 2
ON CONFLICT (campaign_key) DO NOTHING;
