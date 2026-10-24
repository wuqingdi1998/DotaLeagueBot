-- Minimal surrounding schema for real draft handlers in an isolated local database.
-- The draft tables and constraints are installed from the project's migrations.
CREATE SEQUENCE archived_player_steam_id_seq START 2000000000;
CREATE TABLE players (
    discord_id BIGINT PRIMARY KEY,
    steam_id32 BIGINT NOT NULL UNIQUE,
    ingame_name TEXT NOT NULL,
    real_name TEXT,
    positions TEXT,
    avatar_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ
);
CREATE TABLE player_identities (id BIGINT PRIMARY KEY);
CREATE TABLE player_identity_members (identity_id BIGINT, player_id BIGINT);
CREATE TABLE web_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    discord_id BIGINT NOT NULL REFERENCES players(discord_id),
    discord_username TEXT NOT NULL,
    discord_avatar_url TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX web_sessions_latest_avatar_idx ON web_sessions(discord_id, created_at DESC);
CREATE TABLE trusted_organizers (discord_id BIGINT PRIMARY KEY);
CREATE TABLE web_organizer_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    discord_id BIGINT,
    session_kind TEXT NOT NULL DEFAULT 'player',
    role TEXT NOT NULL DEFAULT 'organizer',
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE season_matches (id BIGINT PRIMARY KEY);
CREATE TABLE season_match_rooms (
    match_id BIGINT PRIMARY KEY REFERENCES season_matches(id),
    status VARCHAR(24) NOT NULL DEFAULT 'drafting',
    team_a_captain_id BIGINT,
    team_b_captain_id BIGINT,
    CONSTRAINT season_match_rooms_status_check CHECK (status IN ('waiting', 'voting', 'drafting'))
);
CREATE TABLE season_match_room_players (
    match_id BIGINT NOT NULL REFERENCES season_matches(id),
    player_id BIGINT NOT NULL REFERENCES players(discord_id),
    team_side TEXT NOT NULL CHECK (team_side IN ('a', 'b')),
    slot_number SMALLINT NOT NULL,
    PRIMARY KEY (match_id, player_id)
);
CREATE TABLE season_match_room_presence (
    match_id BIGINT NOT NULL REFERENCES season_matches(id),
    player_id BIGINT NOT NULL REFERENCES players(discord_id),
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, player_id)
);
