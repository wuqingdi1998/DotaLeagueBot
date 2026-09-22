ALTER TABLE season_matches
    ADD COLUMN host_role_expires_at TIMESTAMPTZ;

CREATE TABLE season_lobby_host_role_members (
    player_id BIGINT PRIMARY KEY
);

UPDATE season_matches
SET host_role_expires_at = updated_at + INTERVAL '10 minutes'
WHERE status = 'completed' AND host_player_id IS NOT NULL;

INSERT INTO season_lobby_host_role_members (player_id)
SELECT DISTINCT match.host_player_id
FROM season_matches AS match
JOIN season_lobbies AS lobby ON lobby.id = match.lobby_id
JOIN season_rounds AS round ON round.id = lobby.round_id
WHERE match.host_player_id IS NOT NULL
  AND (round.lobby_configuration_status = 'published'
       OR (round.round_kind = 'finals' AND match.status = 'published'))
ON CONFLICT DO NOTHING;

CREATE FUNCTION set_season_host_role_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $function$
BEGIN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        NEW.host_role_expires_at := NOW() + INTERVAL '10 minutes';
    ELSIF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
        NEW.host_role_expires_at := NULL;
    END IF;
    RETURN NEW;
END
$function$;

CREATE TRIGGER season_host_role_expiry
BEFORE UPDATE OF status ON season_matches
FOR EACH ROW EXECUTE FUNCTION set_season_host_role_expiry();

CREATE FUNCTION wake_season_host_role_sync_for_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $function$
BEGIN
    IF TG_OP <> 'INSERT' AND OLD.host_player_id IS NOT NULL THEN
        INSERT INTO season_lobby_host_role_members (player_id)
        VALUES (OLD.host_player_id) ON CONFLICT DO NOTHING;
    END IF;
    IF TG_OP <> 'DELETE' AND NEW.host_player_id IS NOT NULL THEN
        INSERT INTO season_lobby_host_role_members (player_id)
        VALUES (NEW.host_player_id) ON CONFLICT DO NOTHING;
    END IF;
    PERFORM pg_notify('bot_scheduled_events', 'season_host_role');
    RETURN NULL;
END
$function$;

CREATE TRIGGER season_host_role_match_changed
AFTER INSERT OR UPDATE OF host_player_id, status OR DELETE ON season_matches
FOR EACH ROW EXECUTE FUNCTION wake_season_host_role_sync_for_match();

CREATE FUNCTION wake_season_host_role_sync_for_round()
RETURNS TRIGGER LANGUAGE plpgsql AS $function$
BEGIN
    IF NEW.lobby_configuration_status = 'published' THEN
        INSERT INTO season_lobby_host_role_members (player_id)
        SELECT DISTINCT match.host_player_id
        FROM season_lobbies AS lobby
        JOIN season_matches AS match ON match.lobby_id = lobby.id
        WHERE lobby.round_id = NEW.id AND match.host_player_id IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
    PERFORM pg_notify('bot_scheduled_events', 'season_host_role');
    RETURN NULL;
END
$function$;

CREATE TRIGGER season_host_role_round_changed
AFTER UPDATE OF lobby_configuration_status ON season_rounds
FOR EACH ROW EXECUTE FUNCTION wake_season_host_role_sync_for_round();
