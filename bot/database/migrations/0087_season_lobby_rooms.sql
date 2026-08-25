ALTER TABLE season_matches
    ADD COLUMN IF NOT EXISTS host_player_id BIGINT
        REFERENCES players(discord_id) ON DELETE SET NULL;

ALTER TABLE draft_series
    ADD COLUMN IF NOT EXISTS season_match_id BIGINT
        REFERENCES season_matches(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS draft_series_season_match_unique
    ON draft_series(season_match_id)
    WHERE season_match_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS season_match_rooms (
    match_id BIGINT PRIMARY KEY
        REFERENCES season_matches(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'voting', 'drafting')),
    is_force_started BOOLEAN NOT NULL DEFAULT FALSE,
    team_a_captain_id BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
    team_b_captain_id BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
    voting_started_at TIMESTAMPTZ,
    draft_started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW season_match_room_players AS
WITH latest_match_substitution AS (
    SELECT DISTINCT ON (substitution.match_id, substitution.outgoing_player_id)
        substitution.match_id,
        substitution.outgoing_player_id,
        substitution.incoming_player_id
    FROM season_match_substitutions substitution
    WHERE substitution.game_id IS NULL
    ORDER BY substitution.match_id, substitution.outgoing_player_id,
        substitution.id DESC
)
SELECT participant.match_id,
    COALESCE(substitution.incoming_player_id, participant.player_id) AS player_id,
    participant.player_id AS source_player_id,
    participant.team_side,
    CASE
        WHEN substitution.incoming_player_id IS NULL
            THEN participant.tier_snapshot
        ELSE COALESCE(
            NULLIF(incoming_player.internal_rating, 0),
            CASE
                WHEN incoming_player.rank_tier >= 10
                    THEN incoming_player.rank_tier / 10
                WHEN incoming_player.rank_tier > 0
                    THEN incoming_player.rank_tier
                ELSE NULL
            END
        )
    END AS tier_snapshot,
    participant.slot_number
FROM season_match_participants participant
LEFT JOIN latest_match_substitution substitution
    ON substitution.match_id = participant.match_id
   AND substitution.outgoing_player_id = participant.player_id
LEFT JOIN players incoming_player
    ON incoming_player.discord_id = substitution.incoming_player_id;

CREATE TABLE IF NOT EXISTS season_match_room_presence (
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS season_match_room_presence_recent_idx
    ON season_match_room_presence(match_id, heartbeat_at DESC);

CREATE TABLE IF NOT EXISTS season_match_room_messages (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    message VARCHAR(500) NOT NULL CHECK (LENGTH(TRIM(message)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS season_match_room_messages_recent_idx
    ON season_match_room_messages(match_id, id DESC);

CREATE TABLE IF NOT EXISTS season_match_captain_votes (
    match_id BIGINT NOT NULL REFERENCES season_matches(id) ON DELETE CASCADE,
    voter_player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    candidate_player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    team_side CHAR(1) NOT NULL CHECK (team_side IN ('a', 'b')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, voter_player_id)
);
CREATE INDEX IF NOT EXISTS season_match_captain_votes_tally_idx
    ON season_match_captain_votes(match_id, team_side, candidate_player_id);
