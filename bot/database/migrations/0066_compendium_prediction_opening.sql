CREATE TABLE IF NOT EXISTS compendium_prediction_days (
    moscow_date DATE PRIMARY KEY,
    opens_at TIMESTAMPTZ NOT NULL,
    configured_by BIGINT NOT NULL REFERENCES players(discord_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO compendium_prediction_days(moscow_date, opens_at, configured_by)
SELECT
    match.moscow_date,
    match.moscow_date::timestamp AT TIME ZONE 'Europe/Moscow',
    MIN(match.configured_by)
FROM compendium_prediction_matches match
GROUP BY match.moscow_date
ON CONFLICT (moscow_date) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'compendium_prediction_matches_day_fkey'
    ) THEN
        ALTER TABLE compendium_prediction_matches
            ADD CONSTRAINT compendium_prediction_matches_day_fkey
            FOREIGN KEY (moscow_date)
            REFERENCES compendium_prediction_days(moscow_date)
            ON DELETE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS compendium_prediction_days_opening_idx
    ON compendium_prediction_days(opens_at, moscow_date);
