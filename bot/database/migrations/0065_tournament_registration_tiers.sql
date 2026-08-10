ALTER TABLE tournaments
    ADD COLUMN IF NOT EXISTS max_team_tier SMALLINT
        CHECK (max_team_tier BETWEEN 1 AND 100),
    ADD COLUMN IF NOT EXISTS show_tiers BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tournament_team_members
    ADD COLUMN IF NOT EXISTS tier_snapshot SMALLINT
        CHECK (tier_snapshot BETWEEN 0 AND 12);

UPDATE tournaments tournament
SET show_tiers = TRUE
WHERE EXISTS (
    SELECT 1
    FROM tournament_team_applications application
    JOIN tournament_roster_snapshots snapshot
      ON snapshot.application_id = application.id
    WHERE application.tournament_id = tournament.id
      AND snapshot.tier_snapshot IS NOT NULL
);
