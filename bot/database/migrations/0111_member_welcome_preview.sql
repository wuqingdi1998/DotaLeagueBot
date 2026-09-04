INSERT INTO notification_outbox (
    discord_id,
    event_type,
    title,
    message,
    action_url
)
SELECT player.discord_id,
       'member_welcome_preview',
       'Предпросмотр приветствия новому участнику',
       'Отправляется в том же виде, что и новому участнику.',
       NULL
FROM players player
WHERE player.discord_id = 311247030422863882;
