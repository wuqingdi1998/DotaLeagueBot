CREATE TABLE compendium_star_race_final_predictions (
    quest_date DATE PRIMARY KEY,
    team_names TEXT[] NOT NULL CHECK (cardinality(team_names) = 6),
    winner_position SMALLINT CHECK (winner_position BETWEEN 1 AND 6),
    configured_by BIGINT NOT NULL REFERENCES players(discord_id),
    result_recorded_by BIGINT REFERENCES players(discord_id),
    result_recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compendium_star_race_final_prediction_picks (
    quest_date DATE NOT NULL REFERENCES compendium_star_race_final_predictions(quest_date) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    predicted_position SMALLINT NOT NULL CHECK (predicted_position BETWEEN 1 AND 6),
    picked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (quest_date, player_id)
);
