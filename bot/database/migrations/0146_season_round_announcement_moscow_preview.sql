WITH recipient (discord_id) AS (
    VALUES (311247030422863882::BIGINT)
),
upcoming_round AS (
    SELECT round.id
    FROM season_rounds AS round
    JOIN tournaments AS tournament ON tournament.id = round.tournament_id
    WHERE tournament.tournament_type = 'seasonal'
      AND tournament.status = 'active'
      AND round.round_kind = 'regular'
      AND round.is_visible = TRUE
      AND round.scheduled_at > NOW()
      AND season_round_status_at(round.scheduled_at, round.status) = 'planned'
    ORDER BY round.scheduled_at, round.id
    LIMIT 1
)
INSERT INTO notification_outbox (
    discord_id,
    event_type,
    title,
    message,
    season_round_id,
    status
)
SELECT
    recipient.discord_id,
    'season_round_announcement_preview_moscow_time',
    'Образец анонса тура',
    'Текст формируется ботом из актуальных данных тура.',
    upcoming_round.id,
    'cancelled'
FROM recipient
CROSS JOIN upcoming_round
WHERE NOT EXISTS (
    SELECT 1
    FROM notification_outbox AS existing
    WHERE existing.discord_id = recipient.discord_id
      AND existing.event_type = 'season_round_announcement_preview_moscow_time'
);
