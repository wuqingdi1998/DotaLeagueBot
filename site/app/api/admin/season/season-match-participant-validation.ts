export async function validateSeasonMatchParticipantEligibility(
  client: import("pg").PoolClient,
  matchId: number,
  selected: string[],
) {
  const result = await client.query<{
    finalists_are_valid: boolean;
    registrations_are_valid: boolean;
  }>(
    `SELECT (
       round.round_kind <> 'finals'
       OR (
         SELECT COUNT(*)
         FROM season_finalists finalist
         WHERE finalist.tournament_id = round.tournament_id
           AND finalist.player_id = ANY($2::bigint[])
       ) = $3
     ) AS finalists_are_valid,
     (
       round.round_kind = 'finals'
       OR (
         SELECT COUNT(*)
         FROM season_round_registrations registration
         WHERE registration.round_id = round.id
           AND registration.player_id = ANY($2::bigint[])
       ) = $3
     ) AS registrations_are_valid
     FROM season_matches match
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     WHERE match.id = $1`,
    [matchId, selected, selected.length],
  );
  if (!result.rows[0]?.finalists_are_valid) {
    throw new Response(
      "Сначала добавьте всех выбранных игроков в список участников финалов",
      { status: 400 },
    );
  }
  if (!result.rows[0]?.registrations_are_valid) {
    throw new Response(
      "В состав обычного тура можно добавить только зарегистрированных на него игроков",
      { status: 400 },
    );
  }
}
