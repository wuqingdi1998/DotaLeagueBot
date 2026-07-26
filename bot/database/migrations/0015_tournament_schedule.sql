CREATE TABLE IF NOT EXISTS tournament_schedule_days (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    day_date DATE NOT NULL,
    title VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (tournament_id, sort_order)
);

CREATE TABLE IF NOT EXISTS tournament_schedule_entries (
    id BIGSERIAL PRIMARY KEY,
    day_id BIGINT NOT NULL
        REFERENCES tournament_schedule_days(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    stage_name VARCHAR(160) NOT NULL,
    match_count SMALLINT NOT NULL CHECK (match_count BETWEEN 1 AND 64),
    series_format VARCHAR(40) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (day_id, sort_order)
);

CREATE INDEX IF NOT EXISTS tournament_schedule_days_order_idx
    ON tournament_schedule_days(tournament_id, sort_order, day_date);

WITH tournament AS (
    SELECT id
    FROM tournaments
    WHERE slug = 'cd-fastcup-5'
),
inserted_days AS (
    INSERT INTO tournament_schedule_days (
        tournament_id, day_date, title, sort_order
    )
    SELECT id, '2026-05-23'::date, 'День 1', 1 FROM tournament
    UNION ALL
    SELECT id, '2026-05-24'::date, 'День 2', 2 FROM tournament
    ON CONFLICT (tournament_id, sort_order) DO UPDATE
    SET day_date = EXCLUDED.day_date,
        title = EXCLUDED.title
    RETURNING id, day_date
)
INSERT INTO tournament_schedule_entries (
    day_id, start_time, stage_name, match_count, series_format, sort_order
)
SELECT day.id, entry.start_time, entry.stage_name,
       entry.match_count, entry.series_format, entry.sort_order
FROM inserted_days day
JOIN (
    VALUES
        ('2026-05-23'::date, '20:00'::time, 'Групповой этап · Раунд 1', 3, 'BO1', 1),
        ('2026-05-23'::date, '21:15'::time, 'Групповой этап · Раунд 2', 3, 'BO1', 2),
        ('2026-05-23'::date, '22:30'::time, 'Групповой этап · Раунд 3', 3, 'BO1', 3),
        ('2026-05-23'::date, '23:45'::time, 'Плей-офф · Раунд 1', 2, 'BO1', 4),
        ('2026-05-24'::date, '20:00'::time, 'Плей-офф · Раунд 2', 1, 'BO1', 1),
        ('2026-05-24'::date, '21:15'::time, 'Гранд-финал', 1, 'BO3', 2)
) AS entry(day_date, start_time, stage_name, match_count, series_format, sort_order)
    ON entry.day_date = day.day_date
ON CONFLICT (day_id, sort_order) DO UPDATE
SET start_time = EXCLUDED.start_time,
    stage_name = EXCLUDED.stage_name,
    match_count = EXCLUDED.match_count,
    series_format = EXCLUDED.series_format;
