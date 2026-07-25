CREATE TABLE IF NOT EXISTS tournament_team_results (
    application_id BIGINT PRIMARY KEY
        REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
    placement SMALLINT CHECK (placement BETWEEN 1 AND 64),
    result_label VARCHAR(120),
    updated_by BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (placement IS NOT NULL OR NULLIF(BTRIM(result_label), '') IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS player_medals (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    tournament_id BIGINT REFERENCES tournaments(id) ON DELETE SET NULL,
    medal_type VARCHAR(10) NOT NULL
        CHECK (medal_type IN ('gold', 'silver', 'bronze')),
    title VARCHAR(160) NOT NULL,
    description TEXT,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    awarded_by BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS player_medals_player_idx
    ON player_medals(player_id, medal_type, awarded_at DESC);
CREATE INDEX IF NOT EXISTS player_medals_tournament_idx
    ON player_medals(tournament_id);
