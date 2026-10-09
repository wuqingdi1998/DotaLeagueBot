ALTER TABLE compendium_star_race_quest_completions
    ADD COLUMN match_evidence_complete BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE compendium_star_race_quest_wins
    DROP CONSTRAINT compendium_star_race_quest_wins_completion_id_hero_id_key;

ALTER TABLE compendium_star_race_quest_wins
    DROP CONSTRAINT compendium_star_race_quest_wins_position_check;

ALTER TABLE compendium_star_race_quest_wins
    ADD CONSTRAINT compendium_star_race_quest_wins_position_check CHECK (position > 0);
