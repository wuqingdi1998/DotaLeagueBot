ALTER TABLE tournament_matches
    ADD COLUMN IF NOT EXISTS eliminated_team_application_id BIGINT
        REFERENCES tournament_team_applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tournament_matches_eliminated_team_idx
    ON tournament_matches(eliminated_team_application_id)
    WHERE eliminated_team_application_id IS NOT NULL;
