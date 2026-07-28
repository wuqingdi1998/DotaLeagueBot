ALTER TABLE tournaments
    ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(16) NOT NULL
        DEFAULT 'ordinary'
        CHECK (tournament_type IN ('ordinary', 'seasonal')),
    ADD COLUMN IF NOT EXISTS season_round_count SMALLINT NOT NULL
        DEFAULT 0
        CHECK (season_round_count BETWEEN 0 AND 100);

ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_season_round_count_by_type_check
    CHECK (
        (tournament_type = 'ordinary' AND season_round_count = 0)
        OR (tournament_type = 'seasonal' AND season_round_count BETWEEN 1 AND 100)
    );

CREATE TABLE IF NOT EXISTS season_participants (
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS season_rounds (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number SMALLINT NOT NULL CHECK (round_number BETWEEN 1 AND 100),
    name VARCHAR(160),
    status VARCHAR(20) NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tournament_id, round_number)
);
CREATE INDEX IF NOT EXISTS season_rounds_visibility_idx
    ON season_rounds(tournament_id, is_visible, round_number);

CREATE TABLE IF NOT EXISTS season_lobbies (
    id BIGSERIAL PRIMARY KEY,
    round_id BIGINT NOT NULL REFERENCES season_rounds(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (round_id, sort_order)
);
CREATE INDEX IF NOT EXISTS season_lobbies_round_idx
    ON season_lobbies(round_id, sort_order);

CREATE TABLE IF NOT EXISTS season_matches (
    id BIGSERIAL PRIMARY KEY,
    lobby_id BIGINT NOT NULL REFERENCES season_lobbies(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ,
    team_a_name VARCHAR(120) NOT NULL DEFAULT 'Команда A',
    team_b_name VARCHAR(120) NOT NULL DEFAULT 'Команда B',
    best_of SMALLINT NOT NULL DEFAULT 2 CHECK (best_of IN (1, 2, 3, 5)),
    team_a_score SMALLINT CHECK (team_a_score >= 0),
    team_b_score SMALLINT CHECK (team_b_score >= 0),
    result VARCHAR(16) CHECK (result IN ('team_a', 'draw', 'team_b')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lobby_id, sort_order),
    CHECK (
        result IS NULL
        OR (
            team_a_score IS NOT NULL
            AND team_b_score IS NOT NULL
            AND (
                (result = 'draw' AND team_a_score = team_b_score)
                OR (result = 'team_a' AND team_a_score > team_b_score)
                OR (result = 'team_b' AND team_b_score > team_a_score)
            )
        )
    ),
    CHECK (
        status <> 'completed'
        OR (
            result IS NOT NULL
            AND team_a_score IS NOT NULL
            AND team_b_score IS NOT NULL
        )
    )
);
CREATE INDEX IF NOT EXISTS season_matches_lobby_idx
    ON season_matches(lobby_id, sort_order);

CREATE TABLE IF NOT EXISTS season_match_participants (
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE RESTRICT,
    team_side CHAR(1) NOT NULL CHECK (team_side IN ('a', 'b')),
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, player_id),
    UNIQUE (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS season_match_participants_player_idx
    ON season_match_participants(player_id, match_id);

CREATE TABLE IF NOT EXISTS season_match_games (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    game_number SMALLINT NOT NULL CHECK (game_number BETWEEN 1 AND 20),
    dota_match_id VARCHAR(32),
    winner_side VARCHAR(8) CHECK (winner_side IN ('a', 'draw', 'b')),
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, game_number),
    CHECK (dota_match_id IS NULL OR dota_match_id ~ '^[0-9]{1,32}$')
);
CREATE INDEX IF NOT EXISTS season_match_games_match_idx
    ON season_match_games(match_id, game_number);
