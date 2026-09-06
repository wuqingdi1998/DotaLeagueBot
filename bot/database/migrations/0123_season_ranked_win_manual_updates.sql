ALTER TABLE season_ranked_win_checks
    ADD COLUMN source TEXT NOT NULL DEFAULT 'stratz'
        CHECK (source IN ('stratz', 'dotabuff', 'manual'));
