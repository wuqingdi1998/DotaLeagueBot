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
       'Повторная проверка ссылки на профиль администратора.',
       NULL,
       'cancelled'
FROM players player
WHERE player.discord_id = 311247030422863882;
