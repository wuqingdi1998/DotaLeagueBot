ALTER TABLE season_matches
    ADD COLUMN IF NOT EXISTS dota_lobby_password VARCHAR(4)
        CHECK (dota_lobby_password ~ '^[0-9]{4}$');

CREATE TABLE IF NOT EXISTS season_lobby_notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL
        REFERENCES season_matches(id) ON DELETE CASCADE,
    discord_id BIGINT NOT NULL
        REFERENCES players(discord_id) ON DELETE CASCADE,
    audience VARCHAR(8) NOT NULL CHECK (audience IN ('host', 'player')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    attempts SMALLINT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    discord_message_id BIGINT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, discord_id, audience)
);

CREATE INDEX IF NOT EXISTS season_lobby_notification_outbox_pending_idx
    ON season_lobby_notification_outbox (scheduled_for, id)
    WHERE status = 'pending';

CREATE OR REPLACE FUNCTION sync_season_lobby_notifications(
    target_match_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE season_matches AS match
    SET dota_lobby_password = LPAD(
            FLOOR(random() * 10000)::INTEGER::TEXT,
            4,
            '0'
        ),
        updated_at = NOW()
    FROM season_lobbies AS lobby
    JOIN season_rounds AS round ON round.id = lobby.round_id
    WHERE match.id = target_match_id
      AND match.lobby_id = lobby.id
      AND round.round_kind = 'regular'
      AND round.lobby_configuration_status = 'published'
      AND match.dota_lobby_password IS NULL;

    UPDATE season_lobby_notification_outbox
    SET status = 'cancelled', updated_at = NOW()
    WHERE match_id = target_match_id
      AND status IN ('pending', 'failed');

    INSERT INTO season_lobby_notification_outbox (
        match_id,
        discord_id,
        audience,
        title,
        message,
        scheduled_for
    )
    SELECT
        match.id,
        participant.player_id,
        CASE
            WHEN participant.player_id = match.host_player_id THEN 'host'
            ELSE 'player'
        END,
        CASE
            WHEN participant.player_id = match.host_player_id
                THEN 'Матч скоро начнется! Вы – хост лобби'
            ELSE 'Матч начинается!'
        END,
        CASE
            WHEN participant.player_id = match.host_player_id THEN format(
                E'Создайте лобби в Dota 2 со следующими данными:\n\nНазвание: **%s**\nПароль: **%s**\n\nНе изменяйте название и пароль – эти же данные уже отправлены остальным игрокам.\n\nСтраница лобби на сайте:\n[Открыть лобби](%s)',
                lobby.name,
                match.dota_lobby_password,
                RTRIM(settings.public_base_url, '/')
                    || '/season-lobby/' || match.id
            )
            ELSE format(
                E'Подключитесь к лобби в Dota 2:\n\nНазвание: **%s**\nПароль: **%s**\n\nЕсли лобби ещё не появилось, подождите немного – хост создаёт его.\n\nСтраница лобби на сайте:\n[Открыть лобби](%s)',
                lobby.name,
                match.dota_lobby_password,
                RTRIM(settings.public_base_url, '/')
                    || '/season-lobby/' || match.id
            )
        END,
        CASE
            WHEN participant.player_id = match.host_player_id
                THEN lobby.scheduled_at - INTERVAL '5 minutes'
            ELSE lobby.scheduled_at
        END
    FROM season_matches AS match
    JOIN season_lobbies AS lobby ON lobby.id = match.lobby_id
    JOIN season_rounds AS round ON round.id = lobby.round_id
    JOIN season_lobby_announcement_settings AS settings
      ON settings.tournament_id = round.tournament_id
    JOIN season_match_room_players AS participant
      ON participant.match_id = match.id
    WHERE match.id = target_match_id
      AND round.round_kind = 'regular'
      AND round.lobby_configuration_status = 'published'
      AND lobby.scheduled_at IS NOT NULL
      AND lobby.scheduled_at > NOW()
      AND match.host_player_id IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM season_match_room_players AS host
          WHERE host.match_id = match.id
            AND host.player_id = match.host_player_id
      )
    ON CONFLICT (match_id, discord_id, audience) DO UPDATE
    SET title = EXCLUDED.title,
        message = EXCLUDED.message,
        scheduled_for = EXCLUDED.scheduled_for,
        status = CASE
            WHEN season_lobby_notification_outbox.status = 'sent' THEN 'sent'
            ELSE 'pending'
        END,
        attempts = CASE
            WHEN season_lobby_notification_outbox.status = 'sent'
                THEN season_lobby_notification_outbox.attempts
            ELSE 0
        END,
        last_error = CASE
            WHEN season_lobby_notification_outbox.status = 'sent'
                THEN season_lobby_notification_outbox.last_error
            ELSE NULL
        END,
        updated_at = NOW();
END
$function$;

SELECT sync_season_lobby_notifications(match.id)
FROM season_matches AS match
JOIN season_lobbies AS lobby ON lobby.id = match.lobby_id
JOIN season_rounds AS round ON round.id = lobby.round_id
JOIN season_lobby_announcement_settings AS settings
  ON settings.tournament_id = round.tournament_id
WHERE round.round_kind = 'regular'
  AND round.lobby_configuration_status = 'published'
  AND lobby.scheduled_at > NOW();
