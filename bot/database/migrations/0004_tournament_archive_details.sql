ALTER TABLE tournament_team_applications
    ALTER COLUMN captain_discord_id DROP NOT NULL;

ALTER TABLE tournament_team_applications
    ADD COLUMN IF NOT EXISTS selection_method VARCHAR(80) NOT NULL DEFAULT 'Регистрация',
    ADD COLUMN IF NOT EXISTS captain_name_snapshot VARCHAR(100),
    ADD COLUMN IF NOT EXISTS team_tier_total_snapshot SMALLINT
        CHECK (team_tier_total_snapshot BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS tournament_roster_snapshots (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL
        REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
    nickname_snapshot VARCHAR(100) NOT NULL,
    role VARCHAR(24) NOT NULL CHECK (
        role IN ('safe_lane', 'mid_lane', 'off_lane', 'soft_support', 'hard_support')
    ),
    tier_snapshot SMALLINT CHECK (tier_snapshot BETWEEN 0 AND 20),
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (application_id, role)
);
CREATE INDEX IF NOT EXISTS tournament_roster_player_idx
    ON tournament_roster_snapshots(player_id);

CREATE TABLE IF NOT EXISTS tournament_rules (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    rule_text TEXT NOT NULL,
    UNIQUE (tournament_id, sort_order)
);

CREATE TABLE IF NOT EXISTS tournament_prizes (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    placement SMALLINT NOT NULL CHECK (placement BETWEEN 1 AND 64),
    application_id BIGINT
        REFERENCES tournament_team_applications(id) ON DELETE SET NULL,
    team_name_snapshot VARCHAR(100),
    prize_text VARCHAR(160),
    UNIQUE (tournament_id, placement)
);

ALTER TABLE tournament_matches
    ADD COLUMN IF NOT EXISTS result_type VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (result_type IN ('normal', 'technical', 'forfeit', 'cancelled')),
    ADD COLUMN IF NOT EXISTS team_a_result_label VARCHAR(20),
    ADD COLUMN IF NOT EXISTS team_b_result_label VARCHAR(20),
    ADD COLUMN IF NOT EXISTS decision_note TEXT,
    ADD COLUMN IF NOT EXISTS bracket_round SMALLINT,
    ADD COLUMN IF NOT EXISTS bracket_side VARCHAR(20)
        CHECK (bracket_side IN ('group', 'upper', 'lower', 'grand_final')),
    ADD COLUMN IF NOT EXISTS bracket_slot SMALLINT;

