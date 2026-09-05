CREATE TABLE IF NOT EXISTS season_ranked_win_reminder_settings (
    tournament_id BIGINT PRIMARY KEY
        REFERENCES tournaments(id) ON DELETE CASCADE,
    primary_role_wins_required SMALLINT NOT NULL
        CHECK (primary_role_wins_required > 0),
    secondary_role_wins_required SMALLINT NOT NULL
        CHECK (secondary_role_wins_required > 0),
    registration_delay_minutes SMALLINT NOT NULL
        CHECK (registration_delay_minutes BETWEEN 1 AND 1440),
    round_lead_minutes INTEGER NOT NULL
        CHECK (round_lead_minutes BETWEEN 1 AND 10080),
    registration_reminders_start_at TIMESTAMPTZ NOT NULL,
    scheduled_reminders_start_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS season_ranked_win_reminder_catch_ups (
    round_id BIGINT NOT NULL
        REFERENCES season_rounds(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (round_id, event_type)
);

INSERT INTO season_ranked_win_reminder_settings (
    tournament_id,
    primary_role_wins_required,
    secondary_role_wins_required,
    registration_delay_minutes,
    round_lead_minutes,
    registration_reminders_start_at,
    scheduled_reminders_start_at
)
SELECT
    id,
    10,
    4,
    10,
    2880,
    TIMESTAMPTZ '2026-09-05 13:00:00+03',
    TIMESTAMPTZ '2026-09-05 13:00:00+03'
FROM tournaments
WHERE slug = 'league-season-9'
ON CONFLICT (tournament_id) DO UPDATE
SET primary_role_wins_required = EXCLUDED.primary_role_wins_required,
    secondary_role_wins_required = EXCLUDED.secondary_role_wins_required,
    registration_delay_minutes = EXCLUDED.registration_delay_minutes,
    round_lead_minutes = EXCLUDED.round_lead_minutes,
    registration_reminders_start_at = EXCLUDED.registration_reminders_start_at,
    scheduled_reminders_start_at = EXCLUDED.scheduled_reminders_start_at,
    updated_at = NOW();

INSERT INTO season_ranked_win_reminder_catch_ups (
    round_id,
    event_type,
    scheduled_at
)
SELECT
    round.id,
    'season_ranked_wins_first_round_catch_up',
    TIMESTAMPTZ '2026-09-05 13:00:00+03'
FROM season_rounds AS round
JOIN tournaments AS tournament ON tournament.id = round.tournament_id
WHERE tournament.slug = 'league-season-9'
  AND round.round_number = 1
  AND round.round_kind = 'regular'
ON CONFLICT (round_id, event_type) DO NOTHING;
