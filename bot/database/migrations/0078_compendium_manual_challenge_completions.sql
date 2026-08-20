ALTER TABLE compendium_user_quest_completions
    ALTER COLUMN matched_hero_id DROP NOT NULL,
    ALTER COLUMN matched_match_id DROP NOT NULL,
    ADD COLUMN completion_source VARCHAR(16) NOT NULL DEFAULT 'automatic',
    ADD COLUMN completed_manually_by BIGINT REFERENCES players(discord_id);

ALTER TABLE compendium_user_quest_completions
    ADD CONSTRAINT compendium_user_quest_completion_source_check
    CHECK (
        (
            completion_source = 'automatic'
            AND matched_hero_id IS NOT NULL
            AND matched_match_id IS NOT NULL
            AND completed_manually_by IS NULL
        )
        OR (
            completion_source = 'manual'
            AND matched_hero_id IS NULL
            AND matched_match_id IS NULL
            AND completed_manually_by IS NOT NULL
        )
    );

ALTER TABLE compendium_star_race_quest_completions
    ADD COLUMN completed_manually_by BIGINT REFERENCES players(discord_id);
