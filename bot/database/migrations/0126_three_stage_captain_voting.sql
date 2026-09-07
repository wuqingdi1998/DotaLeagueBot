UPDATE season_match_rooms
SET status = 'waiting', voting_started_at = NULL
WHERE status = 'voting';

ALTER TABLE season_match_rooms
    DROP CONSTRAINT IF EXISTS season_match_rooms_status_check;
ALTER TABLE season_match_rooms
    ALTER COLUMN status TYPE VARCHAR(24);
ALTER TABLE season_match_rooms
    ADD CONSTRAINT season_match_rooms_status_check CHECK (status IN (
        'waiting', 'captain_interest', 'captain_voting', 'captain_tiebreak',
        'drafting', 'playing', 'break', 'completed'
    ));
ALTER TABLE season_match_rooms
    ADD COLUMN IF NOT EXISTS captain_stage_deadline_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS season_match_captain_preferences (
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    team_side CHAR(1) NOT NULL CHECK (team_side IN ('a', 'b')),
    wants_to_be_captain BOOLEAN NOT NULL,
    responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, player_id)
);

ALTER TABLE season_match_captain_votes
    ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS season_match_captain_tiebreaks (
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    team_side CHAR(1) NOT NULL CHECK (team_side IN ('a', 'b')),
    voter_player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    candidate_one_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    candidate_two_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    selected_candidate_id BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (match_id, team_side),
    CHECK (candidate_one_id <> candidate_two_id),
    CHECK (
        selected_candidate_id IS NULL
        OR selected_candidate_id IN (candidate_one_id, candidate_two_id)
    )
);
