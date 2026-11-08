-- Даты проведения остаются обязательными; неподтверждённые отметки обзора необязательны.
ALTER TABLE tournaments
    ALTER COLUMN registration_deadline DROP NOT NULL,
    ALTER COLUMN check_in_minutes DROP NOT NULL,
    ALTER COLUMN check_in_minutes DROP DEFAULT,
    ADD COLUMN IF NOT EXISTS show_start_in_overview BOOLEAN NOT NULL DEFAULT TRUE;
