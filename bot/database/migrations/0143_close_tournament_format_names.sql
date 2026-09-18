CREATE OR REPLACE FUNCTION canonical_close_game_format(raw_format TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $function$
    SELECT CASE
        WHEN LOWER(BTRIM(COALESCE(raw_format, ''))) LIKE '%fearless%'
            THEN 'Fearless Draft'
        WHEN UPPER(BTRIM(COALESCE(raw_format, ''))) IN (
            'CM', 'CAPTAIN''S MODE', 'CAPTAINS MODE', 'CAPITAN''S MODE'
        ) THEN 'Captain''s Mode'
        WHEN UPPER(BTRIM(COALESCE(raw_format, ''))) IN (
            'CD', 'CAPTAIN''S DRAFT', 'CAPTAINS DRAFT', 'CAPITAN''S DRAFT'
        ) THEN 'Captain''s Draft'
        WHEN UPPER(BTRIM(COALESCE(raw_format, ''))) IN (
            'SD', 'SINGLE DRAFT'
        ) THEN 'Single Draft'
        ELSE 'Другой режим'
    END
$function$;

UPDATE close_events
SET game_format = canonical_close_game_format(game_format);

UPDATE tournaments tournament
SET format = event.game_format,
    updated_at = NOW()
FROM close_events event
WHERE event.tournament_id = tournament.id;
