ALTER TABLE october_compendium_verification_requests
    ADD COLUMN discord_channel_id BIGINT,
    ADD COLUMN notification_deleted_at TIMESTAMPTZ,
    ADD COLUMN notification_delete_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN notification_delete_error TEXT;

CREATE INDEX october_verification_notification_cleanup
    ON october_compendium_verification_requests(notification_delete_retry_at)
    WHERE status = 'completed' AND discord_message_id IS NOT NULL
        AND notification_deleted_at IS NULL;
