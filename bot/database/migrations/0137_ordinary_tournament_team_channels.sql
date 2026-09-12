CREATE TABLE IF NOT EXISTS ordinary_tournament_team_channel_access (
    tournament_id BIGINT PRIMARY KEY
        REFERENCES tournaments(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordinary_tournament_team_channels (
    application_id BIGINT PRIMARY KEY
        REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
    tournament_id BIGINT NOT NULL
        REFERENCES tournaments(id) ON DELETE CASCADE,
    discord_channel_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tournament_id, application_id)
);

CREATE TABLE IF NOT EXISTS ordinary_tournament_team_channel_members (
    application_id BIGINT NOT NULL
        REFERENCES ordinary_tournament_team_channels(application_id)
        ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    PRIMARY KEY (application_id, player_id)
);

CREATE INDEX IF NOT EXISTS ordinary_team_channel_access_open_idx
    ON ordinary_tournament_team_channel_access (tournament_id)
    WHERE closed_at IS NULL;

DROP TRIGGER IF EXISTS ordinary_team_member_scheduler_wakeup
    ON tournament_team_members;
CREATE TRIGGER ordinary_team_member_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON tournament_team_members
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS ordinary_team_channel_access_scheduler_wakeup
    ON ordinary_tournament_team_channel_access;
CREATE TRIGGER ordinary_team_channel_access_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON ordinary_tournament_team_channel_access
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();
