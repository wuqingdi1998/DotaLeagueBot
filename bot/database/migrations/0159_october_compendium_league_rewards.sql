ALTER TABLE compendium_admin_star_adjustments
    ADD COLUMN IF NOT EXISTS season_match_id BIGINT
        REFERENCES season_matches(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS compendium_admin_stars_season_match_unique
    ON compendium_admin_star_adjustments(player_id, season_match_id)
    WHERE season_match_id IS NOT NULL;
