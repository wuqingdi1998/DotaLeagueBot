ALTER TABLE october_compendium_clan_members
    ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0
    CHECK (total_points >= 0);
