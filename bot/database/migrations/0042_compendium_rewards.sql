ALTER TABLE compendium_daily_quests
    DROP CONSTRAINT IF EXISTS compendium_daily_quests_position_check;
ALTER TABLE compendium_daily_quests
    ADD CONSTRAINT compendium_daily_quests_position_check
    CHECK (position BETWEEN 1 AND 4);

ALTER TABLE compendium_daily_quest_heroes
    DROP CONSTRAINT IF EXISTS compendium_daily_quest_heroes_position_check;
ALTER TABLE compendium_daily_quest_heroes
    ADD CONSTRAINT compendium_daily_quest_heroes_position_check
    CHECK (position BETWEEN 1 AND 6);

ALTER TABLE compendium_user_quest_rerolls
    DROP CONSTRAINT IF EXISTS compendium_user_quest_rerolls_player_id_quest_set_id_key;
ALTER TABLE compendium_user_quest_rerolls
    DROP CONSTRAINT IF EXISTS compendium_user_quest_rerolls_player_id_daily_quest_id_key;

ALTER TABLE compendium_user_quest_reroll_heroes
    DROP CONSTRAINT IF EXISTS compendium_user_quest_reroll_heroes_position_check;
ALTER TABLE compendium_user_quest_reroll_heroes
    ADD CONSTRAINT compendium_user_quest_reroll_heroes_position_check
    CHECK (position BETWEEN 1 AND 6);

CREATE INDEX IF NOT EXISTS compendium_rerolls_latest_quest_idx
    ON compendium_user_quest_rerolls(
        player_id, daily_quest_id, used_at DESC, id DESC
    );
