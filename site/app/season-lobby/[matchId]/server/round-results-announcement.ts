import type { PoolClient } from "pg";

export async function queueCompletedSeasonRoundResultsAnnouncement(
  client: PoolClient,
  seasonMatchId: number,
): Promise<void> {
  await client.query(
    `INSERT INTO channel_announcement_outbox (
       dedupe_key,
       channel_id,
       content,
       attachment_name
     )
     SELECT
       format(
         'season-round-results-tournament-%s-round-%s',
         tournament.id,
         round.round_number
       ),
       settings.channel_id,
       format(
         '[Результаты](%s/tournaments/%s?round=%s) и [таблица](%s/tournaments/%s/standings) после %s-го тура лиги',
         RTRIM(settings.public_base_url, '/'),
         tournament.slug,
         round.round_number,
         RTRIM(settings.public_base_url, '/'),
         tournament.slug,
         round.round_number
       ),
       settings.attachment_prefix || round.round_number || '.png'
     FROM season_matches completed_match
     JOIN season_lobbies lobby ON lobby.id = completed_match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     JOIN season_round_result_announcement_settings settings
       ON settings.tournament_id = tournament.id
     WHERE completed_match.id = $1
       AND round.round_kind = 'regular'
       AND round.round_number >= settings.first_round_number
       AND NOT EXISTS (
         SELECT 1
         FROM season_lobbies pending_lobby
         JOIN season_matches pending_match
           ON pending_match.lobby_id = pending_lobby.id
         WHERE pending_lobby.round_id = round.id
           AND pending_match.status IS DISTINCT FROM 'completed'
       )
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [seasonMatchId],
  );
}
