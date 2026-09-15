CREATE TABLE IF NOT EXISTS season_round_result_announcement_settings (
    tournament_id BIGINT PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL,
    public_base_url TEXT NOT NULL,
    attachment_prefix TEXT NOT NULL,
    first_round_number INTEGER NOT NULL DEFAULT 1
        CHECK (first_round_number > 0)
);

INSERT INTO season_round_result_announcement_settings (
    tournament_id,
    channel_id,
    public_base_url,
    attachment_prefix,
    first_round_number
)
SELECT
    tournament.id,
    1038761680521416754::BIGINT,
    'https://lsesports.ru',
    'Rez',
    3
FROM tournaments tournament
WHERE tournament.slug = 'league-season-9'
ON CONFLICT (tournament_id) DO UPDATE
SET channel_id = EXCLUDED.channel_id,
    public_base_url = EXCLUDED.public_base_url,
    attachment_prefix = EXCLUDED.attachment_prefix,
    first_round_number = EXCLUDED.first_round_number;
