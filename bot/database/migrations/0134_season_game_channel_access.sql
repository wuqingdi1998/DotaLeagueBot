CREATE TABLE IF NOT EXISTS season_game_channel_access_windows (
    round_id BIGINT PRIMARY KEY
        REFERENCES season_rounds(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ,
    close_scheduled_for TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (close_scheduled_for IS NULL OR opened_at IS NOT NULL),
    CHECK (closed_at IS NULL OR close_scheduled_for IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS season_game_channel_access_close_idx
    ON season_game_channel_access_windows (close_scheduled_for, round_id)
    WHERE opened_at IS NOT NULL AND closed_at IS NULL;

CREATE OR REPLACE FUNCTION schedule_season_game_channel_close()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    target_round_id BIGINT;
BEGIN
    SELECT lobby.round_id
    INTO target_round_id
    FROM season_lobbies AS lobby
    WHERE lobby.id = NEW.lobby_id;

    UPDATE season_game_channel_access_windows AS access
    SET close_scheduled_for = NOW() + INTERVAL '10 minutes',
        updated_at = NOW()
    WHERE access.round_id = target_round_id
      AND access.opened_at IS NOT NULL
      AND access.closed_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM season_lobbies AS sibling_lobby
          JOIN season_matches AS sibling
            ON sibling.lobby_id = sibling_lobby.id
          WHERE sibling_lobby.round_id = target_round_id
            AND sibling.status NOT IN ('completed', 'cancelled')
      );

    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS season_game_channel_close_after_results
    ON season_matches;
CREATE TRIGGER season_game_channel_close_after_results
AFTER UPDATE OF status ON season_matches
FOR EACH ROW
WHEN (
    NEW.status = 'completed'
    AND OLD.status IS DISTINCT FROM NEW.status
)
EXECUTE FUNCTION schedule_season_game_channel_close();

DROP TRIGGER IF EXISTS season_game_channel_access_scheduler_wakeup
    ON season_game_channel_access_windows;
CREATE TRIGGER season_game_channel_access_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON season_game_channel_access_windows
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();
