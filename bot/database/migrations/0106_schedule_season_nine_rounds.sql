WITH schedule (round_number, scheduled_at) AS (
    VALUES
        (1,  TIMESTAMPTZ '2026-09-06 21:00:00+03'),
        (2,  TIMESTAMPTZ '2026-09-11 22:00:00+03'),
        (3,  TIMESTAMPTZ '2026-09-20 21:00:00+03'),
        (4,  TIMESTAMPTZ '2026-09-25 22:00:00+03'),
        (5,  TIMESTAMPTZ '2026-10-04 21:00:00+03'),
        (6,  TIMESTAMPTZ '2026-10-09 22:00:00+03'),
        (7,  TIMESTAMPTZ '2026-10-18 21:00:00+03'),
        (8,  TIMESTAMPTZ '2026-10-23 22:00:00+03'),
        (9,  TIMESTAMPTZ '2026-11-01 21:00:00+03'),
        (10, TIMESTAMPTZ '2026-11-06 22:00:00+03'),
        (11, TIMESTAMPTZ '2026-11-15 21:00:00+03'),
        (12, TIMESTAMPTZ '2026-11-20 22:00:00+03'),
        (13, TIMESTAMPTZ '2026-11-29 21:00:00+03'),
        (14, TIMESTAMPTZ '2026-12-04 22:00:00+03')
)
UPDATE season_rounds AS round
SET name = format('Тур %s', schedule.round_number),
    scheduled_at = schedule.scheduled_at,
    updated_at = NOW()
FROM tournaments AS tournament
JOIN schedule ON TRUE
WHERE round.tournament_id = tournament.id
  AND tournament.slug = 'league-season-9'
  AND round.round_kind = 'regular'
  AND round.round_number = schedule.round_number;
