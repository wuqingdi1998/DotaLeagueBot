ALTER TABLE compendium_daily_quests
    ADD COLUMN player_id BIGINT
        REFERENCES players(discord_id) ON DELETE CASCADE;

ALTER TABLE compendium_daily_quests
    DROP CONSTRAINT IF EXISTS compendium_daily_quests_quest_set_id_position_key;

ALTER TABLE compendium_daily_quest_heroes
    DROP CONSTRAINT IF EXISTS compendium_daily_quest_heroes_quest_set_id_hero_id_key;

CREATE UNIQUE INDEX compendium_daily_quests_player_position_idx
    ON compendium_daily_quests(quest_set_id, player_id, position)
    WHERE player_id IS NOT NULL;

CREATE UNIQUE INDEX compendium_daily_quests_legacy_position_idx
    ON compendium_daily_quests(quest_set_id, position)
    WHERE player_id IS NULL;

CREATE INDEX compendium_daily_quests_player_idx
    ON compendium_daily_quests(player_id, quest_set_id);
