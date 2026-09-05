import type { PoolClient } from "pg";

export async function queueSeasonLobbyPublishedAnnouncement(
  client: PoolClient,
  roundId: number,
) {
  await client.query(
    `INSERT INTO channel_announcement_outbox (
       dedupe_key,
       channel_id,
       content,
       attachment_name
     )
     SELECT
       format(
         'season-lobby-published-tournament-%s-round-%s',
         tournament.id,
         round.round_number
       ),
       settings.channel_id,
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
       settings.attachment_prefix || round.round_number || '.png'
     FROM season_rounds round
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     JOIN season_lobby_announcement_settings settings
       ON settings.tournament_id = tournament.id
     WHERE round.id = $1
       AND round.round_kind = 'regular'
       AND round.scheduled_at IS NOT NULL
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [roundId],
  );
}
