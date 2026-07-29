ALTER TABLE season_point_adjustments
    ADD COLUMN adjustment_kind VARCHAR(16) NOT NULL DEFAULT 'manual'
        CHECK (adjustment_kind IN ('manual', 'activity'));

CREATE INDEX season_point_adjustments_kind_idx
    ON season_point_adjustments(tournament_id, adjustment_kind, player_id);

ALTER TABLE season_participants
    ADD COLUMN rank_snapshot SMALLINT
        CHECK (rank_snapshot BETWEEN 1 AND 500),
    ADD COLUMN standings_snapshot JSONB
        CHECK (
            standings_snapshot IS NULL
            OR jsonb_typeof(standings_snapshot) = 'object'
        );
