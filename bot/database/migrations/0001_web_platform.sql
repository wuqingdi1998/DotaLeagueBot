CREATE TABLE IF NOT EXISTS site_admins (
    discord_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    discord_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    discord_username VARCHAR(100) NOT NULL,
    discord_avatar_url TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS web_sessions_expiry_idx ON web_sessions(expires_at);

CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT REFERENCES players(discord_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    eyebrow VARCHAR(200) NOT NULL,
    headline VARCHAR(200) NOT NULL,
    headline_accent VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    about TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    status_label VARCHAR(100) NOT NULL,
    format VARCHAR(100) NOT NULL,
    team_size SMALLINT NOT NULL CHECK (team_size BETWEEN 1 AND 10),
    max_teams SMALLINT NOT NULL CHECK (max_teams BETWEEN 2 AND 64),
    region VARCHAR(100) NOT NULL,
    server VARCHAR(100) NOT NULL,
    check_in_minutes SMALLINT NOT NULL CHECK (check_in_minutes BETWEEN 5 AND 180),
    group_format VARCHAR(200) NOT NULL,
    playoff_format VARCHAR(200) NOT NULL,
    final_format VARCHAR(200) NOT NULL,
    discord_url TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'registration', 'active', 'finished', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tournament_dates_valid CHECK (
        registration_deadline <= start_at AND start_at < end_at
    )
);

CREATE TABLE IF NOT EXISTS tournament_organizers (
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    discord_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tournament_id, discord_id)
);

CREATE TABLE IF NOT EXISTS tournament_team_applications (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name VARCHAR(20) NOT NULL,
    tag VARCHAR(5) NOT NULL,
    captain_discord_id BIGINT NOT NULL REFERENCES players(discord_id),
    contact VARCHAR(100) NOT NULL,
    logo_key VARCHAR(80) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'awaiting_members'
        CHECK (status IN ('awaiting_members', 'pending', 'approved', 'declined', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tournament_id, team_name),
    UNIQUE (tournament_id, tag)
);
CREATE INDEX IF NOT EXISTS tournament_applications_status_idx
    ON tournament_team_applications(tournament_id, status);

CREATE TABLE IF NOT EXISTS tournament_team_members (
    application_id BIGINT NOT NULL
        REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id),
    role VARCHAR(24) NOT NULL CHECK (
        role IN ('safe_lane', 'mid_lane', 'off_lane', 'soft_support', 'hard_support')
    ),
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    invitation_status VARCHAR(16) NOT NULL DEFAULT 'invited'
        CHECK (invitation_status IN ('invited', 'accepted', 'declined')),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (application_id, player_id),
    UNIQUE (application_id, role)
);
CREATE INDEX IF NOT EXISTS tournament_member_invites_idx
    ON tournament_team_members(player_id, invitation_status);

CREATE TABLE IF NOT EXISTS tournament_groups (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (tournament_id, name)
);

CREATE TABLE IF NOT EXISTS tournament_group_teams (
    group_id BIGINT NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    application_id BIGINT NOT NULL
        REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (group_id, application_id),
    UNIQUE (application_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES tournament_groups(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    stage VARCHAR(100) NOT NULL,
    team_a_application_id BIGINT
        REFERENCES tournament_team_applications(id) ON DELETE SET NULL,
    team_b_application_id BIGINT
        REFERENCES tournament_team_applications(id) ON DELETE SET NULL,
    team_a_placeholder VARCHAR(100),
    team_b_placeholder VARCHAR(100),
    team_a_score SMALLINT,
    team_b_score SMALLINT,
    best_of SMALLINT NOT NULL CHECK (best_of IN (1, 2, 3, 5)),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'ready', 'live', 'finished', 'cancelled')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (team_a_application_id IS NOT NULL OR team_a_placeholder IS NOT NULL),
    CHECK (team_b_application_id IS NOT NULL OR team_b_placeholder IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS tournament_matches_order_idx
    ON tournament_matches(tournament_id, sort_order, scheduled_at);

CREATE TABLE IF NOT EXISTS tournament_match_checkins (
    match_id BIGINT NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
    application_id BIGINT NOT NULL
        REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
    checked_in_by BIGINT NOT NULL REFERENCES players(discord_id),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, application_id)
);

CREATE TABLE IF NOT EXISTS tournament_audit_log (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT REFERENCES tournaments(id) ON DELETE SET NULL,
    actor_discord_id BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(80),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tournament_audit_created_idx
    ON tournament_audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    discord_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    attempts SMALLINT NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
    ON notification_outbox(status, available_at, id);
