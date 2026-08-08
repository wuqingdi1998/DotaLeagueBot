CREATE TABLE IF NOT EXISTS compendium_star_race_quest_progress_wins (
    player_id BIGINT NOT NULL,
    moscow_date DATE NOT NULL,
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 6),
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    matched_match_id BIGINT NOT NULL CHECK (matched_match_id > 0),
    PRIMARY KEY (player_id, moscow_date, position),
    UNIQUE (player_id, moscow_date, hero_id),
    UNIQUE (player_id, moscow_date, matched_match_id),
    FOREIGN KEY (player_id, moscow_date)
        REFERENCES compendium_star_race_quest_progress(player_id, moscow_date)
        ON DELETE CASCADE
);
