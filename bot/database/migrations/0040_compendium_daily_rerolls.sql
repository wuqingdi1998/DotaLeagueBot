CREATE TABLE IF NOT EXISTS compendium_user_quest_rerolls (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    quest_set_id BIGINT NOT NULL
        REFERENCES compendium_daily_quest_sets(id) ON DELETE CASCADE,
    daily_quest_id BIGINT NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, quest_set_id),
    UNIQUE (player_id, daily_quest_id),
    FOREIGN KEY (daily_quest_id, quest_set_id)
        REFERENCES compendium_daily_quests(id, quest_set_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compendium_user_quest_reroll_heroes (
    reroll_id BIGINT NOT NULL
        REFERENCES compendium_user_quest_rerolls(id) ON DELETE CASCADE,
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 4),
    PRIMARY KEY (reroll_id, hero_id),
    UNIQUE (reroll_id, position)
);

CREATE INDEX IF NOT EXISTS compendium_rerolls_player_idx
    ON compendium_user_quest_rerolls(player_id, used_at DESC);
