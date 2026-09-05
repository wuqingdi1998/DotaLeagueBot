INSERT INTO notification_outbox (
    discord_id,
    event_type,
    title,
    message,
    action_url,
    status
)
SELECT player.discord_id,
       'member_welcome_preview',
       'Предпросмотр приветствия новому участнику',
       'Отправляется в том же виде, что и новому участнику.',
       NULL,
       'cancelled'
FROM players player
WHERE player.discord_id = 311247030422863882;
