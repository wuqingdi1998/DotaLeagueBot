import type { PoolClient } from "pg";

type SeasonAward = {
  player_id: string;
  medal: "gold" | "silver";
};

export async function syncSeasonFinalAwards(
  client: PoolClient,
  tournamentId: number,
  awardedBy: string,
) {
  const tournament = await client.query<{ name: string }>(
    `SELECT name
     FROM tournaments
     WHERE id = $1 AND tournament_type = 'seasonal'
     FOR UPDATE`,
    [tournamentId],
  );
  if (!tournament.rowCount) return;

  const awards = await client.query<SeasonAward>(
    `SELECT participant.player_id::text,
       CASE
         WHEN participant.team_side =
           CASE match.result WHEN 'team_a' THEN 'a' ELSE 'b' END
         THEN 'gold'
         ELSE 'silver'
       END AS medal
     FROM season_match_participants participant
     JOIN season_matches match ON match.id = participant.match_id
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     WHERE round.tournament_id = $1
       AND round.round_kind = 'finals'
       AND match.status = 'completed'
       AND match.result IN ('team_a', 'team_b')`,
    [tournamentId],
  );

  await client.query(
    "UPDATE season_finalists SET medal = NULL WHERE tournament_id = $1",
    [tournamentId],
  );
  await client.query(
    "DELETE FROM player_medals WHERE tournament_id = $1",
    [tournamentId],
  );
  if (!awards.rowCount) return;

  const playerIds = awards.rows.map((award) => award.player_id);
  const medals = awards.rows.map((award) => award.medal);

  await client.query(
    `UPDATE season_finalists finalist
     SET medal = award.medal, updated_at = NOW()
     FROM UNNEST($2::bigint[], $3::varchar[])
       AS award(player_id, medal)
     WHERE finalist.tournament_id = $1
       AND finalist.player_id = award.player_id`,
    [tournamentId, playerIds, medals],
  );
  await client.query(
    `INSERT INTO player_medals (
       player_id, tournament_id, medal_type, title,
       description, awarded_by
     )
     SELECT
       award.player_id,
       $1,
       award.medal,
       $4 || CASE
         WHEN award.medal = 'gold'
         THEN ' — Победитель'
         ELSE ' — Финалист'
       END,
       'Награда по результату раздела «Финалы»',
       $5
     FROM UNNEST($2::bigint[], $3::varchar[])
       AS award(player_id, medal)`,
    [
      tournamentId,
      playerIds,
      medals,
      tournament.rows[0].name,
      awardedBy,
    ],
  );
}
