ALTER TABLE players
    ADD COLUMN IF NOT EXISTS archived_steam_id32 BIGINT;

CREATE SEQUENCE IF NOT EXISTS archived_player_steam_id_seq
    AS BIGINT
    START WITH -9223372036854775807
    INCREMENT BY 1
    MINVALUE -9223372036854775807
    MAXVALUE -1
    NO CYCLE;

UPDATE players
SET archived_steam_id32 = steam_id32,
    steam_id32 = nextval('archived_player_steam_id_seq')
WHERE is_archived = TRUE
  AND steam_id32 BETWEEN 1 AND 4294967295
  AND archived_steam_id32 IS NULL;
