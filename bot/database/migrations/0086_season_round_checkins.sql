CREATE TABLE IF NOT EXISTS season_round_checkins (
    round_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (round_id, player_id),
    FOREIGN KEY (round_id, player_id)
        REFERENCES season_round_registrations(round_id, player_id)
        ON DELETE CASCADE
);

ALTER TABLE notification_outbox
    ADD COLUMN IF NOT EXISTS season_round_id BIGINT
        REFERENCES season_rounds(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_season_round_unique
    ON notification_outbox(discord_id, season_round_id, event_type)
    WHERE season_round_id IS NOT NULL;
