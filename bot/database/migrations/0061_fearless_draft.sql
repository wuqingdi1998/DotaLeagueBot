CREATE TABLE IF NOT EXISTS draft_queue (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS draft_queue_heartbeat_idx
    ON draft_queue(heartbeat_at DESC);

CREATE TABLE IF NOT EXISTS draft_invitations (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    recipient_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    format VARCHAR(3) NOT NULL CHECK (format IN ('BO2', 'BO3')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    CHECK (sender_id <> recipient_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS draft_invitations_unique_pending_idx
    ON draft_invitations(sender_id, recipient_id)
    WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS draft_invitations_recipient_idx
    ON draft_invitations(recipient_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS draft_series (
    id BIGSERIAL PRIMARY KEY,
    player1_id BIGINT NOT NULL REFERENCES players(discord_id),
    player2_id BIGINT NOT NULL REFERENCES players(discord_id),
    format VARCHAR(3) NOT NULL CHECK (format IN ('BO2', 'BO3')),
    status VARCHAR(24) NOT NULL DEFAULT 'CHOOSING'
        CHECK (status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE', 'COMPLETE', 'ABANDONED')),
    current_map SMALLINT NOT NULL DEFAULT 1 CHECK (current_map BETWEEN 1 AND 3),
    map1_coin_toss_winner_id BIGINT NOT NULL REFERENCES players(discord_id),
    player1_dismissed_at TIMESTAMPTZ,
    player2_dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (player1_id <> player2_id),
    CHECK (map1_coin_toss_winner_id IN (player1_id, player2_id))
);
CREATE INDEX IF NOT EXISTS draft_series_player1_idx
    ON draft_series(player1_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS draft_series_player2_idx
    ON draft_series(player2_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS draft_maps (
    id BIGSERIAL PRIMARY KEY,
    series_id BIGINT NOT NULL REFERENCES draft_series(id) ON DELETE CASCADE,
    map_number SMALLINT NOT NULL CHECK (map_number BETWEEN 1 AND 3),
    status VARCHAR(24) NOT NULL DEFAULT 'FIRST_DECISION'
        CHECK (status IN ('FIRST_DECISION', 'SECOND_DECISION', 'DRAFTING', 'COMPLETE')),
    coin_toss_winner_id BIGINT REFERENCES players(discord_id),
    first_chooser_id BIGINT NOT NULL REFERENCES players(discord_id),
    first_choice VARCHAR(8)
        CHECK (first_choice IN ('RADIANT', 'DIRE', 'FIRST', 'SECOND')),
    second_choice VARCHAR(8)
        CHECK (second_choice IN ('RADIANT', 'DIRE', 'FIRST', 'SECOND')),
    radiant_player_id BIGINT REFERENCES players(discord_id),
    first_pick_player_id BIGINT REFERENCES players(discord_id),
    current_step SMALLINT NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 24),
    step_started_at TIMESTAMPTZ,
    player1_reserve_seconds NUMERIC(7, 3) NOT NULL DEFAULT 130 CHECK (player1_reserve_seconds >= 0),
    player2_reserve_seconds NUMERIC(7, 3) NOT NULL DEFAULT 130 CHECK (player2_reserve_seconds >= 0),
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE (series_id, map_number)
);
CREATE INDEX IF NOT EXISTS draft_maps_series_idx
    ON draft_maps(series_id, map_number);

CREATE TABLE IF NOT EXISTS draft_actions (
    id BIGSERIAL PRIMARY KEY,
    map_id BIGINT NOT NULL REFERENCES draft_maps(id) ON DELETE CASCADE,
    step SMALLINT NOT NULL CHECK (step BETWEEN 0 AND 23),
    actor_id BIGINT NOT NULL REFERENCES players(discord_id),
    action_type VARCHAR(4) NOT NULL CHECK (action_type IN ('PICK', 'BAN')),
    hero_id INTEGER,
    is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (map_id, step),
    UNIQUE (map_id, hero_id),
    CHECK (action_type = 'BAN' OR hero_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS draft_actions_map_idx
    ON draft_actions(map_id, step);

CREATE TABLE IF NOT EXISTS draft_presence (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    series_id BIGINT NOT NULL REFERENCES draft_series(id) ON DELETE CASCADE,
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS draft_presence_series_idx
    ON draft_presence(series_id, heartbeat_at DESC);
