DROP INDEX october_verification_notification_cleanup;
CREATE INDEX october_verification_notification_cleanup
    ON october_compendium_verification_requests(notification_delete_retry_at)
    WHERE status IN ('completed', 'cancelled') AND discord_message_id IS NOT NULL
        AND notification_deleted_at IS NULL;
