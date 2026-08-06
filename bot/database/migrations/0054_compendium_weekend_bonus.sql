ALTER TABLE compendium_user_quest_completions
    DROP CONSTRAINT IF EXISTS compendium_user_quest_completions_reward_amount_check;

ALTER TABLE compendium_user_quest_completions
    ADD CONSTRAINT compendium_user_quest_completions_reward_amount_check
    CHECK (reward_amount IN (1, 2));

ALTER TABLE compendium_rune_challenge_completions
    DROP CONSTRAINT IF EXISTS compendium_rune_challenge_completions_reward_amount_check;

ALTER TABLE compendium_rune_challenge_completions
    ADD CONSTRAINT compendium_rune_challenge_completions_reward_amount_check
    CHECK (reward_amount IN (1, 2));
