INSERT INTO players (
    discord_id,
    steam_id32,
    ingame_name,
    real_name,
    is_archived,
    archived_at
)
VALUES (
    9223372036854775806,
    nextval('archived_player_steam_id_seq'),
    'Bot',
    'Fearless Draft Bot',
    TRUE,
    NOW()
)
ON CONFLICT (discord_id) DO NOTHING;

DELETE FROM player_identities
WHERE id IN (
    SELECT identity_id
    FROM player_identity_members
    WHERE player_id = 9223372036854775806
);

ALTER TABLE draft_maps
    ADD COLUMN IF NOT EXISTS coin_toss_segment SMALLINT
        CHECK (coin_toss_segment BETWEEN 0 AND 999);

UPDATE draft_maps map
SET coin_toss_segment = CASE
    WHEN map.coin_toss_winner_id = series.player1_id
        THEN 500 + FLOOR(RANDOM() * 500)::int
    ELSE FLOOR(RANDOM() * 500)::int
END
FROM draft_series series
WHERE series.id = map.series_id
  AND map.coin_toss_winner_id IS NOT NULL
  AND map.coin_toss_segment IS NULL;

ALTER TABLE draft_maps
    DROP CONSTRAINT IF EXISTS draft_maps_coin_toss_segment_pair_check;
ALTER TABLE draft_maps
    ADD CONSTRAINT draft_maps_coin_toss_segment_pair_check CHECK (
        (coin_toss_winner_id IS NULL AND coin_toss_segment IS NULL)
        OR (coin_toss_winner_id IS NOT NULL AND coin_toss_segment IS NOT NULL)
    );
