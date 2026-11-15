-- Keep completed rounds and registrations; existing triggers update announcement text and dates.
WITH schedule (round_number, round_kind, scheduled_at) AS (
    VALUES
        (12, 'regular', TIMESTAMPTZ '2026-11-20 22:00:00+03'),
        (13, 'regular', TIMESTAMPTZ '2026-11-29 21:00:00+03'),
        (14, 'regular', TIMESTAMPTZ '2026-12-04 22:00:00+03'),
        (15, 'finals',  TIMESTAMPTZ '2026-12-13 21:00:00+03')
)
UPDATE season_rounds AS round
SET scheduled_at = schedule.scheduled_at,
    is_visible = TRUE,
    updated_at = NOW()
FROM tournaments AS tournament
JOIN schedule ON TRUE
WHERE round.tournament_id = tournament.id
  AND tournament.slug = 'league-season-9'
  AND round.round_number = schedule.round_number
  AND round.round_kind = schedule.round_kind
  AND round.status = 'planned';
