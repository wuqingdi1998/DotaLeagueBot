CREATE TABLE IF NOT EXISTS player_nickname_history (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL
        REFERENCES players(discord_id) ON DELETE CASCADE,
    nickname VARCHAR(100) NOT NULL,
    nickname_key VARCHAR(100) GENERATED ALWAYS AS (
        LOWER(BTRIM(nickname))
    ) STORED,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, nickname_key)
);

ALTER TABLE tournament_team_members
    ADD COLUMN IF NOT EXISTS nickname_snapshot VARCHAR(100);

UPDATE tournament_team_members member
SET nickname_snapshot = player.ingame_name
FROM players player
WHERE player.discord_id = member.player_id
  AND member.nickname_snapshot IS NULL;

ALTER TABLE tournament_team_members
    ALTER COLUMN nickname_snapshot SET NOT NULL;

CREATE OR REPLACE FUNCTION snapshot_tournament_member_nickname()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.nickname_snapshot IS NULL THEN
        SELECT player.ingame_name
        INTO NEW.nickname_snapshot
        FROM players player
        WHERE player.discord_id = NEW.player_id;
    END IF;
    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS tournament_members_snapshot_nickname_trigger
    ON tournament_team_members;
CREATE TRIGGER tournament_members_snapshot_nickname_trigger
BEFORE INSERT OR UPDATE OF player_id ON tournament_team_members
FOR EACH ROW
EXECUTE FUNCTION snapshot_tournament_member_nickname();

INSERT INTO player_nickname_history(player_id, nickname)
SELECT source.player_id, BTRIM(source.nickname)
FROM (
    SELECT discord_id AS player_id, ingame_name AS nickname
    FROM players
    UNION
    SELECT player_id, nickname_snapshot
    FROM player_identity_members
    UNION
    SELECT player_id, nickname_snapshot
    FROM tournament_team_members
    UNION
    SELECT player_id, nickname_snapshot
    FROM tournament_roster_snapshots
    WHERE player_id IS NOT NULL
    UNION
    SELECT player_id, nickname_snapshot
    FROM season_participants
    UNION
    SELECT player_id, nickname_snapshot
    FROM season_match_participants
) source
WHERE NULLIF(BTRIM(source.nickname), '') IS NOT NULL
ON CONFLICT (player_id, nickname_key) DO UPDATE
SET last_seen_at = NOW();

CREATE OR REPLACE FUNCTION remember_player_nickname()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO player_nickname_history(player_id, nickname)
        VALUES (NEW.discord_id, BTRIM(NEW.ingame_name))
        ON CONFLICT (player_id, nickname_key) DO UPDATE
        SET last_seen_at = NOW();
    ELSIF NEW.ingame_name IS DISTINCT FROM OLD.ingame_name THEN
        INSERT INTO player_nickname_history(player_id, nickname)
        VALUES
            (OLD.discord_id, BTRIM(OLD.ingame_name)),
            (NEW.discord_id, BTRIM(NEW.ingame_name))
        ON CONFLICT (player_id, nickname_key) DO UPDATE
        SET last_seen_at = NOW();
    END IF;
    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS players_remember_nickname_trigger ON players;
CREATE TRIGGER players_remember_nickname_trigger
AFTER UPDATE OF ingame_name ON players
FOR EACH ROW
EXECUTE FUNCTION remember_player_nickname();

DROP TRIGGER IF EXISTS players_remember_initial_nickname_trigger ON players;
CREATE TRIGGER players_remember_initial_nickname_trigger
AFTER INSERT ON players
FOR EACH ROW
EXECUTE FUNCTION remember_player_nickname();
