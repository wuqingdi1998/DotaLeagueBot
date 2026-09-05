WITH recipient (discord_id) AS (
    VALUES (311247030422863882::BIGINT)
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
    'season_nine_ranked_win_reminder_corrected_preview',
    'Привет!',
    $message$Ты зарегистрирован на [1 тур](https://lsesports.ru/tournaments/league-season-9?round=1) Linken's Sphere Esports, на данный момент для участия тебе не хватает **6 рейтинговых побед на основной роли** и **3 рейтинговых побед на дополнительной роли**. Сняться без штрафа можно не позже чем за 24 часа до старта тура!

Возможны ошибки при подсчёте рейтинговых побед, в случае недосчёта матчей и обнаруженной очевидной ошибки сообщайте об этом <@311247030422863882> заранее!$message$,
    'cancelled'
FROM recipient
WHERE NOT EXISTS (
    SELECT 1
    FROM notification_outbox AS existing
    WHERE existing.discord_id = recipient.discord_id
      AND existing.event_type = 'season_nine_ranked_win_reminder_corrected_preview'
);
