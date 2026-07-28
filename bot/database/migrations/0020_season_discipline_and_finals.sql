ALTER TABLE season_participants
    ADD COLUMN standings_section VARCHAR(16) NOT NULL DEFAULT 'active'
        CHECK (standings_section IN ('active', 'inactive')),
    ADD COLUMN inactive_reason VARCHAR(240);

ALTER TABLE season_rounds
    DROP CONSTRAINT season_rounds_round_number_check,
    ADD CONSTRAINT season_rounds_round_number_check
        CHECK (round_number BETWEEN 1 AND 101),
    ADD COLUMN round_kind VARCHAR(16) NOT NULL DEFAULT 'regular'
        CHECK (round_kind IN ('regular', 'finals'));

CREATE UNIQUE INDEX season_rounds_one_finals_idx
    ON season_rounds(tournament_id)
    WHERE round_kind = 'finals';

INSERT INTO season_rounds (
    tournament_id, round_number, name, round_kind, is_visible
)
SELECT tournament.id, tournament.season_round_count + 1,
    'Финалы', 'finals', FALSE
FROM tournaments tournament
WHERE tournament.tournament_type = 'seasonal'
  AND NOT EXISTS (
      SELECT 1
      FROM season_rounds round
      WHERE round.tournament_id = tournament.id
        AND round.round_kind = 'finals'
  );

CREATE TABLE season_point_adjustments (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE RESTRICT,
    round_id BIGINT REFERENCES season_rounds(id) ON DELETE SET NULL,
    amount SMALLINT NOT NULL CHECK (amount BETWEEN -99 AND 99 AND amount <> 0),
    reason VARCHAR(240) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX season_point_adjustments_tournament_player_idx
    ON season_point_adjustments(tournament_id, player_id);

CREATE TABLE season_penalty_events (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE RESTRICT,
    round_id BIGINT NOT NULL REFERENCES season_rounds(id) ON DELETE CASCADE,
    fire_count SMALLINT NOT NULL CHECK (fire_count BETWEEN 0 AND 100),
    note VARCHAR(240),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tournament_id, player_id, round_id)
);
CREATE INDEX season_penalty_events_tournament_player_idx
    ON season_penalty_events(tournament_id, player_id, round_id);

CREATE TABLE season_match_substitutions (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    game_id BIGINT REFERENCES season_match_games(id) ON DELETE SET NULL,
    outgoing_player_id BIGINT NOT NULL
        REFERENCES players(discord_id) ON DELETE RESTRICT,
    incoming_player_id BIGINT NOT NULL
        REFERENCES players(discord_id) ON DELETE RESTRICT,
    team_side CHAR(1) NOT NULL CHECK (team_side IN ('a', 'b')),
    technical_loss BOOLEAN NOT NULL DEFAULT TRUE,
    note VARCHAR(240),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (outgoing_player_id <> incoming_player_id),
    UNIQUE (match_id, game_id, outgoing_player_id, incoming_player_id)
);
CREATE INDEX season_match_substitutions_match_idx
    ON season_match_substitutions(match_id, game_id);
CREATE UNIQUE INDEX season_match_substitutions_match_level_idx
    ON season_match_substitutions(
        match_id, outgoing_player_id, incoming_player_id
    )
    WHERE game_id IS NULL;

CREATE TABLE season_finalists (
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE RESTRICT,
    seed SMALLINT CHECK (seed BETWEEN 1 AND 100),
    medal VARCHAR(16) CHECK (medal IN ('gold', 'silver')),
    note VARCHAR(240),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tournament_id, player_id)
);
CREATE INDEX season_finalists_seed_idx
    ON season_finalists(tournament_id, seed, player_id);
