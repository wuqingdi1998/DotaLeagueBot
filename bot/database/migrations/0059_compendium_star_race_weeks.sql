ALTER TABLE compendium_star_race_quest_completions
    DROP CONSTRAINT IF EXISTS compendium_star_race_quest_completions_moscow_date_check;

ALTER TABLE compendium_star_race_quest_completions
    DROP CONSTRAINT IF EXISTS compendium_star_race_quest_completions_reward_amount_check;

ALTER TABLE compendium_star_race_quest_completions
    ADD CONSTRAINT compendium_star_race_quest_completions_reward_amount_check
    CHECK (reward_amount BETWEEN 1 AND 100);

ALTER TABLE compendium_star_race_quest_progress
    DROP CONSTRAINT IF EXISTS compendium_star_race_quest_progress_moscow_date_check;

ALTER TABLE compendium_star_race_quest_wins
    DROP CONSTRAINT IF EXISTS compendium_star_race_quest_wins_position_check;

ALTER TABLE compendium_star_race_quest_wins
    ADD CONSTRAINT compendium_star_race_quest_wins_position_check
    CHECK (position BETWEEN 1 AND 10);
