CREATE TABLE IF NOT EXISTS october_compendium_announcement_campaigns (
    id BIGSERIAL PRIMARY KEY,
    campaign_key VARCHAR(100) NOT NULL UNIQUE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'preparing', 'sending', 'completed')),
    next_batch_at TIMESTAMPTZ,
    discovered_member_count INTEGER NOT NULL DEFAULT 0,
    skipped_bot_count INTEGER NOT NULL DEFAULT 0,
    skipped_excluded_count INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS october_compendium_announcement_recipients (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL
        REFERENCES october_compendium_announcement_campaigns(id) ON DELETE CASCADE,
    discord_id BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    attempts SMALLINT NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    discord_message_id BIGINT,
    last_error TEXT,
    UNIQUE (campaign_id, discord_id)
);

CREATE INDEX IF NOT EXISTS october_compendium_announcement_due_idx
    ON october_compendium_announcement_campaigns(scheduled_at, id)
    WHERE status IN ('scheduled', 'preparing', 'sending');

CREATE INDEX IF NOT EXISTS october_compendium_announcement_recipient_due_idx
    ON october_compendium_announcement_recipients(campaign_id, available_at, id)
    WHERE status = 'pending';

INSERT INTO october_compendium_announcement_campaigns (
    campaign_key,
    scheduled_at
)
VALUES (
    'october-compendium-launch',
    TIMESTAMPTZ '2026-10-03 22:30:00+03'
)
ON CONFLICT (campaign_key) DO NOTHING;
