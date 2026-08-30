CREATE OR REPLACE FUNCTION season_round_status_at(
    scheduled_at_value TIMESTAMPTZ,
    stored_status_value VARCHAR,
    now_value TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VARCHAR
LANGUAGE SQL
STABLE
AS $function$
    SELECT CASE
        WHEN stored_status_value = 'cancelled' THEN 'cancelled'
        WHEN scheduled_at_value IS NULL OR now_value < scheduled_at_value
            THEN 'planned'
        WHEN now_value < scheduled_at_value + INTERVAL '3 hours'
            THEN 'active'
        ELSE 'completed'
    END
$function$;

UPDATE season_rounds
SET status = season_round_status_at(scheduled_at, status),
    updated_at = NOW()
WHERE round_kind = 'regular'
  AND status IS DISTINCT FROM season_round_status_at(scheduled_at, status);

ALTER TABLE season_match_rooms
    DROP CONSTRAINT IF EXISTS season_match_rooms_status_check;
ALTER TABLE season_match_rooms
    ADD CONSTRAINT season_match_rooms_status_check CHECK (
        status IN (
            'waiting', 'voting', 'drafting', 'playing', 'break', 'completed'
        )
    );
