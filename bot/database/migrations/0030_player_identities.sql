ALTER TABLE players
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by BIGINT
        REFERENCES players(discord_id) ON DELETE SET NULL;

UPDATE players
SET is_archived = TRUE,
    archived_at = COALESCE(archived_at, NOW())
WHERE discord_id < 0
   OR steam_id32 < 1
   OR steam_id32 > 4294967295;

CREATE INDEX IF NOT EXISTS players_active_directory_idx
    ON players(is_archived, LOWER(ingame_name));

CREATE TABLE IF NOT EXISTS player_identities (
    id BIGSERIAL PRIMARY KEY,
    primary_nickname VARCHAR(100) NOT NULL,
    registered_player_id BIGINT UNIQUE
        REFERENCES players(discord_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_identity_members (
    identity_id BIGINT NOT NULL
        REFERENCES player_identities(id) ON DELETE CASCADE,
    player_id BIGINT PRIMARY KEY
        REFERENCES players(discord_id) ON DELETE CASCADE,
    nickname_snapshot VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS player_identity_members_identity_idx
    ON player_identity_members(identity_id, player_id);

DO $migration$
DECLARE
    player_row RECORD;
    identity_id_value BIGINT;
BEGIN
    FOR player_row IN
        SELECT discord_id, ingame_name, is_archived
        FROM players
        WHERE NOT EXISTS (
            SELECT 1
            FROM player_identity_members member
            WHERE member.player_id = players.discord_id
        )
        ORDER BY discord_id
    LOOP
        INSERT INTO player_identities(primary_nickname, registered_player_id)
        VALUES (
            player_row.ingame_name,
            CASE
                WHEN player_row.is_archived THEN NULL
                ELSE player_row.discord_id
            END
        )
        RETURNING id INTO identity_id_value;

        INSERT INTO player_identity_members(
            identity_id,
            player_id,
            nickname_snapshot
        )
        VALUES (
            identity_id_value,
            player_row.discord_id,
            player_row.ingame_name
        );
    END LOOP;
END
$migration$;

CREATE OR REPLACE FUNCTION create_player_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    identity_id_value BIGINT;
BEGIN
    INSERT INTO player_identities(primary_nickname, registered_player_id)
    VALUES (
        NEW.ingame_name,
        CASE WHEN NEW.is_archived THEN NULL ELSE NEW.discord_id END
    )
    RETURNING id INTO identity_id_value;

    INSERT INTO player_identity_members(
        identity_id,
        player_id,
        nickname_snapshot
    )
    VALUES (identity_id_value, NEW.discord_id, NEW.ingame_name);
    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS players_create_identity_trigger ON players;
CREATE TRIGGER players_create_identity_trigger
AFTER INSERT ON players
FOR EACH ROW
EXECUTE FUNCTION create_player_identity();

CREATE OR REPLACE FUNCTION update_active_player_identity_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.ingame_name IS DISTINCT FROM OLD.ingame_name AND NOT NEW.is_archived THEN
        UPDATE player_identity_members
        SET nickname_snapshot = NEW.ingame_name
        WHERE player_id = NEW.discord_id;

        UPDATE player_identities identity
        SET primary_nickname = NEW.ingame_name,
            updated_at = NOW()
        FROM player_identity_members member
        WHERE member.identity_id = identity.id
          AND member.player_id = NEW.discord_id
          AND identity.registered_player_id = NEW.discord_id;
    END IF;
    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS players_update_identity_name_trigger ON players;
CREATE TRIGGER players_update_identity_name_trigger
AFTER UPDATE OF ingame_name ON players
FOR EACH ROW
EXECUTE FUNCTION update_active_player_identity_name();
