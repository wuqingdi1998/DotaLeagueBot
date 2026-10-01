CREATE TABLE IF NOT EXISTS october_compendium_clan_reservations (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    clan_id VARCHAR(16) NOT NULL CHECK (clan_id IN ('morbus', 'panacea')),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS october_compendium_clan_reservations_clan_idx
    ON october_compendium_clan_reservations(clan_id, reserved_at, player_id);

CREATE TABLE IF NOT EXISTS october_compendium_clan_activity (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    previous_compendium_stars INTEGER NOT NULL DEFAULT 0
        CHECK (previous_compendium_stars >= 0),
    matches_last_three_months INTEGER NOT NULL DEFAULT 0
        CHECK (matches_last_three_months >= 0),
    ranked_matches_last_three_months INTEGER NOT NULL DEFAULT 0
        CHECK (ranked_matches_last_three_months >= 0),
    last_match_at TIMESTAMPTZ,
    internal_rating INTEGER NOT NULL DEFAULT 0,
    rank_tier INTEGER NOT NULL DEFAULT 0,
    open_dota_status VARCHAR(16) NOT NULL
        CHECK (open_dota_status IN ('available', 'unavailable')),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS october_compendium_clan_formation (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'complete', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO october_compendium_clan_formation (singleton, status)
VALUES (TRUE, 'pending')
ON CONFLICT (singleton) DO UPDATE
SET status = 'pending',
    attempts = 0,
    started_at = NULL,
    completed_at = NULL,
    error_message = NULL,
    updated_at = NOW();

ALTER TABLE october_compendium_clan_members
    ADD COLUMN IF NOT EXISTS assignment_source VARCHAR(16) NOT NULL DEFAULT 'automatic'
        CHECK (assignment_source IN ('reservation', 'automatic')),
    ADD COLUMN IF NOT EXISTS activity_score NUMERIC(12, 3) NOT NULL DEFAULT 0;

DELETE FROM october_compendium_clan_members;
DELETE FROM october_compendium_clan_reservations;
