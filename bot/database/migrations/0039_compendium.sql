CREATE TABLE IF NOT EXISTS compendium_daily_quest_sets (
    id BIGSERIAL PRIMARY KEY,
    moscow_date DATE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compendium_daily_quests (
    id BIGSERIAL PRIMARY KEY,
    quest_set_id BIGINT NOT NULL
        REFERENCES compendium_daily_quest_sets(id) ON DELETE CASCADE,
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (quest_set_id, position),
    UNIQUE (id, quest_set_id)
);

CREATE TABLE IF NOT EXISTS compendium_daily_quest_heroes (
    daily_quest_id BIGINT NOT NULL,
    quest_set_id BIGINT NOT NULL,
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 4),
    PRIMARY KEY (daily_quest_id, hero_id),
    UNIQUE (daily_quest_id, position),
    UNIQUE (quest_set_id, hero_id),
    FOREIGN KEY (daily_quest_id, quest_set_id)
        REFERENCES compendium_daily_quests(id, quest_set_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compendium_user_quest_completions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    daily_quest_id BIGINT NOT NULL
        REFERENCES compendium_daily_quests(id) ON DELETE CASCADE,
    matched_hero_id SMALLINT NOT NULL CHECK (matched_hero_id > 0),
    matched_match_id BIGINT NOT NULL CHECK (matched_match_id > 0),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reward_amount SMALLINT NOT NULL DEFAULT 1 CHECK (reward_amount = 1),
    UNIQUE (player_id, daily_quest_id),
    UNIQUE (player_id, matched_match_id)
);
CREATE INDEX IF NOT EXISTS compendium_completions_player_idx
    ON compendium_user_quest_completions(player_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS compendium_check_rate_limits (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempt_count SMALLINT NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
