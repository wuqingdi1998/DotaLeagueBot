ALTER TABLE season_match_rooms
    DROP CONSTRAINT IF EXISTS season_match_rooms_status_check;
ALTER TABLE season_match_rooms
    ALTER COLUMN status TYPE VARCHAR(24);
ALTER TABLE season_match_rooms
    ADD CONSTRAINT season_match_rooms_status_check CHECK (status IN (
        'waiting', 'captain_interest', 'captain_voting', 'captain_tiebreak',
        'captain_reveal', 'drafting', 'playing', 'break', 'completed'
    ));
ALTER TABLE season_match_rooms
    ADD COLUMN IF NOT EXISTS captain_reveal_next_status VARCHAR(24),
    ADD COLUMN IF NOT EXISTS captain_vote_reveal_until TIMESTAMPTZ;
ALTER TABLE season_match_rooms
    DROP CONSTRAINT IF EXISTS season_match_rooms_captain_reveal_next_check;
ALTER TABLE season_match_rooms
    ADD CONSTRAINT season_match_rooms_captain_reveal_next_check CHECK (
        captain_reveal_next_status IS NULL
        OR captain_reveal_next_status IN ('captain_tiebreak', 'drafting')
    );

ALTER TABLE draft_maps
    DROP CONSTRAINT IF EXISTS draft_maps_status_check;
ALTER TABLE draft_maps
    ADD CONSTRAINT draft_maps_status_check CHECK (status IN (
        'FIRST_DECISION', 'SECOND_DECISION', 'DRAFTING',
        'FINAL_PICK_REVIEW', 'LINEUP_ASSIGNMENT', 'COMPLETE'
    ));
ALTER TABLE draft_maps
    ADD COLUMN IF NOT EXISTS final_pick_review_ends_at TIMESTAMPTZ;
