CREATE TABLE IF NOT EXISTS tournament_team_checkins (
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    application_id BIGINT NOT NULL
        REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
    checked_in_by BIGINT NOT NULL REFERENCES players(discord_id),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tournament_id, application_id)
);

INSERT INTO tournament_team_checkins (
    tournament_id, application_id, checked_in_by, checked_in_at
)
SELECT DISTINCT ON (match.tournament_id, checkin.application_id)
    match.tournament_id,
    checkin.application_id,
    checkin.checked_in_by,
    checkin.checked_in_at
FROM tournament_match_checkins checkin
JOIN tournament_matches match ON match.id = checkin.match_id
JOIN tournament_team_applications application
  ON application.id = checkin.application_id
 AND application.tournament_id = match.tournament_id
ORDER BY match.tournament_id, checkin.application_id, checkin.checked_in_at
ON CONFLICT (tournament_id, application_id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_tournament_checkin_unique
    ON notification_outbox(application_id, event_type)
    WHERE event_type = 'tournament_check_in' AND application_id IS NOT NULL;
