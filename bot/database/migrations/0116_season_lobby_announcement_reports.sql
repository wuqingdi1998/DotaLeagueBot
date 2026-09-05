ALTER TABLE season_lobby_announcement_settings
    ADD COLUMN IF NOT EXISTS report_recipient_id BIGINT,
    ADD COLUMN IF NOT EXISTS report_audience_name TEXT;

UPDATE season_lobby_announcement_settings AS settings
SET report_recipient_id = 311247030422863882,
    report_audience_name = 'анонсы-и-новости'
FROM tournaments tournament
WHERE settings.tournament_id = tournament.id
  AND tournament.slug = 'league-season-9';
