WITH recipient (discord_id) AS (
    VALUES (311247030422863882::BIGINT)
), previews (position, event_type, title, message) AS (
    VALUES
        (
            1,
            'season_nine_registered_player_preview',
            'Привет! 👋',
            $message$На сервере стартует новый, **девятый сезон турниров Linken's Sphere Esports**!

Теперь регистрация на турниры и вся информация о них доступны на нашем сайте - участвовать стало проще и удобнее.

В матчах лиги теперь используется **Fearless Draft**: каждый герой может быть выбран командами только один раз за серию.

Ты уже зарегистрирован на сервере, поэтому для участия в **первом туре** тебе нужно всего лишь нажать кнопку участия:

🌐 [**Сайт**](https://lsesports.ru/)
🏆 [**Первый тур**](https://lsesports.ru/tournaments/league-season-9?round=1)

Напоминаем: для участия в турах лиги необходимо иметь за последний месяц минимум **10 рейтинговых побед на основной роли и 4 рейтинговые победы на дополнительной**.

До встречи в новом сезоне!$message$
        ),
        (
            2,
            'season_nine_unregistered_member_preview',
            'Привет! 👋',
            $message$На сервере стартует новый, **девятый сезон турниров Linken's Sphere Esports**!

Теперь регистрация на турниры и вся информация о них доступны на нашем сайте - участвовать стало проще и удобнее.

В матчах лиги теперь используется **Fearless Draft**: каждый герой может быть выбран командами только один раз за серию.

Для участия сначала необходимо зарегистрироваться на сервере:

📝 [**Регистрация**](https://discord.com/channels/328205360466755584/1457019432034504776)

Ты уже зарегистрирован на сервере, поэтому для участия в **первом туре** тебе нужно всего лишь нажать кнопку участия:

🌐 [**Сайт**](https://lsesports.ru/)
🏆 [**Первый тур**](https://lsesports.ru/tournaments/league-season-9?round=1)

Напоминаем: для участия в турах лиги необходимо иметь за последний месяц минимум **10 рейтинговых побед на основной роли и 4 рейтинговые победы на дополнительной**.

До встречи в новом сезоне!$message$
        )
)
INSERT INTO notification_outbox (
    discord_id,
    event_type,
    title,
    message,
    status
)
SELECT
    recipient.discord_id,
    previews.event_type,
    previews.title,
    previews.message,
    'cancelled'
FROM recipient
CROSS JOIN previews
WHERE NOT EXISTS (
    SELECT 1
    FROM notification_outbox AS existing
    WHERE existing.discord_id = recipient.discord_id
      AND existing.event_type = previews.event_type
)
ORDER BY previews.position;
