ALTER TABLE channel_announcement_outbox
    ADD COLUMN IF NOT EXISTS discord_message_url TEXT,
    ADD COLUMN IF NOT EXISTS report_recipient_id BIGINT,
    ADD COLUMN IF NOT EXISTS report_description TEXT,
    ADD COLUMN IF NOT EXISTS report_status TEXT NOT NULL DEFAULT 'not_required'
        CHECK (report_status IN ('not_required', 'pending', 'sent', 'failed')),
    ADD COLUMN IF NOT EXISTS report_available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS report_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS report_message_id BIGINT,
    ADD COLUMN IF NOT EXISTS report_last_error TEXT,
    ADD COLUMN IF NOT EXISTS tournament_slug_to_publish TEXT;

CREATE INDEX IF NOT EXISTS channel_announcement_outbox_pending_report_idx
    ON channel_announcement_outbox (report_available_at, id)
    WHERE status = 'sent' AND report_status = 'pending';

WITH rounds (
    round_number,
    event_at,
    weekday_name,
    ordinal_number
) AS (
    VALUES
        (1,  TIMESTAMPTZ '2026-09-06 21:00:00+03', 'Воскресенье', '1-ый'),
        (2,  TIMESTAMPTZ '2026-09-11 22:00:00+03', 'Пятница',     '2-ой'),
        (3,  TIMESTAMPTZ '2026-09-20 21:00:00+03', 'Воскресенье', '3-ий'),
        (4,  TIMESTAMPTZ '2026-09-25 22:00:00+03', 'Пятница',     '4-ый'),
        (5,  TIMESTAMPTZ '2026-10-04 21:00:00+03', 'Воскресенье', '5-ый'),
        (6,  TIMESTAMPTZ '2026-10-09 22:00:00+03', 'Пятница',     '6-ой'),
        (7,  TIMESTAMPTZ '2026-10-18 21:00:00+03', 'Воскресенье', '7-ой'),
        (8,  TIMESTAMPTZ '2026-10-23 22:00:00+03', 'Пятница',     '8-ой'),
        (9,  TIMESTAMPTZ '2026-11-01 21:00:00+03', 'Воскресенье', '9-ый'),
        (10, TIMESTAMPTZ '2026-11-06 22:00:00+03', 'Пятница',     '10-ый'),
        (11, TIMESTAMPTZ '2026-11-15 21:00:00+03', 'Воскресенье', '11-ый'),
        (12, TIMESTAMPTZ '2026-11-20 22:00:00+03', 'Пятница',     '12-ый'),
        (13, TIMESTAMPTZ '2026-11-29 21:00:00+03', 'Воскресенье', '13-ый'),
        (14, TIMESTAMPTZ '2026-12-04 22:00:00+03', 'Пятница',     '14-ый')
), audiences (
    audience_key,
    channel_id,
    lead_time,
    audience_name
) AS (
    VALUES
        ('boosty', 1256870455474917477::BIGINT, INTERVAL '5 days', 'Бустевички'),
        ('public', 1038761680521416754::BIGINT, INTERVAL '4 days', 'анонсы-и-новости')
)
INSERT INTO channel_announcement_outbox (
    dedupe_key,
    channel_id,
    content,
    attachment_name,
    available_at,
    report_recipient_id,
    report_description,
    report_status,
    tournament_slug_to_publish
)
SELECT
    format(
        'season9-registration-round-%s-%s',
        rounds.round_number,
        audiences.audience_key
    ),
    audiences.channel_id,
    format(
        E'@everyone\n%s (%s) %s\nОткрыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=%s) на %s тур Linken''s Sphere 5x5 League',
        to_char(rounds.event_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY'),
        rounds.weekday_name,
        to_char(rounds.event_at AT TIME ZONE 'Europe/Moscow', 'HH24:MI'),
        rounds.round_number,
        rounds.ordinal_number
    ),
    format('Reg%s.png', rounds.round_number),
    CASE
        WHEN rounds.round_number = 1 AND audiences.audience_key = 'boosty'
            THEN TIMESTAMPTZ '2026-09-01 22:00:00+03'
        ELSE rounds.event_at - audiences.lead_time
    END,
    311247030422863882::BIGINT,
    format(
        'анонс регистрации на тур №%s — %s',
        rounds.round_number,
        audiences.audience_name
    ),
    'pending',
    'league-season-9'
FROM rounds
CROSS JOIN audiences
ON CONFLICT (dedupe_key) DO NOTHING;
