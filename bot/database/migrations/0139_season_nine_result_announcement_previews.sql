INSERT INTO channel_announcement_outbox (
    dedupe_key,
    channel_id,
    content,
    attachment_name,
    available_at
)
SELECT
    format('season9-results-preview-round-%s', rounds.round_number),
    1461860575259660408::BIGINT,
    format(
        '[Результаты](%s/tournaments/%s?round=%s) и [таблица](%s/tournaments/%s/standings) после %s-го тура лиги',
        RTRIM(settings.public_base_url, '/'),
        tournament.slug,
        rounds.round_number,
        RTRIM(settings.public_base_url, '/'),
        tournament.slug,
        rounds.round_number
    ),
    settings.attachment_prefix || rounds.round_number || '.png',
    'infinity'::TIMESTAMPTZ
FROM tournaments tournament
JOIN season_round_result_announcement_settings settings
    ON settings.tournament_id = tournament.id
CROSS JOIN LATERAL generate_series(
    settings.first_round_number,
    14
) AS rounds(round_number)
WHERE tournament.slug = 'league-season-9'
ON CONFLICT (dedupe_key) DO NOTHING;
