ALTER TABLE tournaments ADD COLUMN playoff_starts_on DATE;

UPDATE tournaments
SET start_at = '2026-11-02 00:00:00+03',
    end_at = '2026-12-13 23:59:00+03',
    playoff_starts_on = '2026-11-30',
    registration_starts_at = NULL,
    registration_deadline = '2026-11-02 00:00:00+03',
    updated_at = NOW()
WHERE slug = 'league-cup-season-9' AND tournament_type = 'seasonal_cup';
