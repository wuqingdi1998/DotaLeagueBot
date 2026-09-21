CREATE TABLE season_penalty_cooling (
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE RESTRICT,
    round_id BIGINT NOT NULL REFERENCES season_rounds(id) ON DELETE CASCADE,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tournament_id, player_id, round_id)
);

CREATE INDEX season_penalty_cooling_tournament_player_idx
    ON season_penalty_cooling(tournament_id, player_id);
