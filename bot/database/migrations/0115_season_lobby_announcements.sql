CREATE TABLE IF NOT EXISTS season_lobby_announcement_settings (
    tournament_id BIGINT PRIMARY KEY
        REFERENCES tournaments(id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL,
    announcement_name TEXT NOT NULL,
    attachment_prefix TEXT NOT NULL,
    public_base_url TEXT NOT NULL,
    time_zone TEXT NOT NULL DEFAULT 'Europe/Moscow'
);

INSERT INTO season_lobby_announcement_settings (
    tournament_id,
    channel_id,
    announcement_name,
    attachment_prefix,
    public_base_url,
    time_zone
)
SELECT
    tournament.id,
    1038761680521416754,
    'Linken''s Sphere 5x5 League',
    'Lob',
    'https://lsesports.ru',
    'Europe/Moscow'
FROM tournaments tournament
WHERE tournament.slug = 'league-season-9'
ON CONFLICT (tournament_id) DO UPDATE
SET channel_id = EXCLUDED.channel_id,
    announcement_name = EXCLUDED.announcement_name,
    attachment_prefix = EXCLUDED.attachment_prefix,
    public_base_url = EXCLUDED.public_base_url,
    time_zone = EXCLUDED.time_zone;

INSERT INTO channel_announcement_outbox (
    dedupe_key,
    channel_id,
    content,
    attachment_name,
    available_at
)
SELECT
    format('season9-lobby-preview-round-%s', round.round_number),
    1461860575259660408,
    format(
        E'@everyone\nОпубликованы [лобби](%s/tournaments/%s?round=%s) %s-го тура %s %s (%s)',
        RTRIM(settings.public_base_url, '/'),
        tournament.slug,
        round.round_number,
        round.round_number,
        settings.announcement_name,
        to_char(
            round.scheduled_at AT TIME ZONE settings.time_zone,
            'DD.MM.YYYY'
        ),
        to_char(
            round.scheduled_at AT TIME ZONE settings.time_zone,
            'HH24:MI'
        )
    ),
    settings.attachment_prefix || round.round_number || '.png',
    'infinity'::TIMESTAMPTZ
FROM season_rounds round
JOIN tournaments tournament ON tournament.id = round.tournament_id
JOIN season_lobby_announcement_settings settings
    ON settings.tournament_id = tournament.id
WHERE tournament.slug = 'league-season-9'
  AND round.round_kind = 'regular'
  AND round.round_number BETWEEN 1 AND 14
  AND round.scheduled_at IS NOT NULL
ON CONFLICT (dedupe_key) DO NOTHING;
