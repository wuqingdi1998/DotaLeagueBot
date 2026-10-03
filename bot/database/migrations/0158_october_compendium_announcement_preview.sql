INSERT INTO notification_outbox (
    discord_id,
    event_type,
    title,
    message,
    status
)
SELECT
    311247030422863882,
    'october_compendium_announcement_preview',
    'Предпросмотр анонса Компендиума',
    'Текст формируется ботом из актуального шаблона анонса Компендиума.',
    'cancelled'
WHERE NOT EXISTS (
    SELECT 1
    FROM notification_outbox AS existing
    WHERE existing.discord_id = 311247030422863882
      AND existing.event_type = 'october_compendium_announcement_preview'
);
