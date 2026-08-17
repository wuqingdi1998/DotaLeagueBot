ALTER TABLE season_rounds
    ADD COLUMN IF NOT EXISTS lobby_configuration_status VARCHAR(16)
        NOT NULL DEFAULT 'none'
        CHECK (
            lobby_configuration_status IN (
                'none', 'editing', 'locked', 'published'
            )
        );

UPDATE season_rounds AS round
SET lobby_configuration_status = CASE
    WHEN round.is_visible THEN 'published'
    ELSE 'editing'
END
WHERE round.lobby_configuration_status = 'none'
  AND EXISTS (
      SELECT 1
      FROM season_lobbies lobby
      WHERE lobby.round_id = round.id
  );

ALTER TABLE season_round_registrations
    ADD COLUMN IF NOT EXISTS tier_snapshot SMALLINT
        CHECK (tier_snapshot BETWEEN 1 AND 12);

UPDATE season_round_registrations AS registration
SET tier_snapshot = COALESCE(
    NULLIF(player.internal_rating, 0),
    CASE
        WHEN player.rank_tier >= 10 THEN player.rank_tier / 10
        WHEN player.rank_tier > 0 THEN player.rank_tier
        ELSE NULL
    END
)::SMALLINT
FROM players player
WHERE player.discord_id = registration.player_id
  AND player.tier_status = 'current'
  AND registration.tier_snapshot IS NULL;

CREATE INDEX IF NOT EXISTS season_round_registrations_order_idx
    ON season_round_registrations(round_id, created_at, player_id);

ALTER TABLE season_match_participants
    ADD COLUMN IF NOT EXISTS slot_number SMALLINT
        CHECK (slot_number BETWEEN 1 AND 5);

WITH numbered AS (
    SELECT match_id, player_id,
        ROW_NUMBER() OVER (
            PARTITION BY match_id, team_side
            ORDER BY created_at, player_id
        ) AS slot_number
    FROM season_match_participants
)
UPDATE season_match_participants AS participant
SET slot_number = numbered.slot_number
FROM numbered
WHERE participant.match_id = numbered.match_id
  AND participant.player_id = numbered.player_id
  AND numbered.slot_number BETWEEN 1 AND 5
  AND participant.slot_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS season_match_participants_slot_idx
    ON season_match_participants(match_id, team_side, slot_number)
    WHERE slot_number IS NOT NULL;
