import type { PoolClient } from "pg";

export type SeasonLobbyReference = {
  id: number;
  match_id: number | null;
};

const lobbyNamesByCount: Record<number, string[]> = {
  1: ["Верхнее лобби"],
  2: ["Верхнее лобби", "Нижнее лобби"],
  3: ["Верхнее лобби", "Среднее лобби", "Нижнее лобби"],
  4: [
    "Верхнее лобби",
    "Среднее лобби",
    "Нижнее лобби",
    "Самое нижнее лобби",
  ],
};

export function seasonLobbyNames(lobbyCount: number) {
  const names = lobbyNamesByCount[lobbyCount];
  if (!names) {
    throw new Response("В туре должно быть от одного до четырёх лобби", {
      status: 400,
    });
  }
  return names;
}

export async function loadSeasonLobbyReferences(
  client: PoolClient,
  roundId: number,
) {
  const result = await client.query<SeasonLobbyReference>(
    `SELECT lobby.id::int, MIN(match.id)::int AS match_id
     FROM season_lobbies lobby
     LEFT JOIN season_matches match ON match.lobby_id = lobby.id
     WHERE lobby.round_id = $1
     GROUP BY lobby.id
     ORDER BY lobby.sort_order, lobby.id`,
    [roundId],
  );
  return result.rows;
}

export async function insertSeasonLobby(
  client: PoolClient,
  roundId: number,
  name: string,
  sortOrder: number,
) {
  const lobby = await client.query<{ id: number }>(
    `INSERT INTO season_lobbies (round_id, name, sort_order, status)
     VALUES ($1, $2, $3, 'draft')
     RETURNING id::int`,
    [roundId, name, sortOrder],
  );
  await client.query(
    `INSERT INTO season_matches
       (lobby_id, team_a_name, team_b_name, best_of, status, sort_order)
     VALUES ($1, 'Левая команда', 'Правая команда', 2, 'draft', 1)`,
    [lobby.rows[0].id],
  );
  return lobby.rows[0].id;
}

export async function renameAndOrderSeasonLobbies(
  client: PoolClient,
  orderedLobbyIds: number[],
) {
  const names = seasonLobbyNames(orderedLobbyIds.length);
  await client.query(
    `UPDATE season_lobbies
     SET sort_order = sort_order + 100
     WHERE id = ANY($1::bigint[])`,
    [orderedLobbyIds],
  );
  for (const [index, lobbyId] of orderedLobbyIds.entries()) {
    await client.query(
      `UPDATE season_lobbies
       SET name = $2, sort_order = $3, updated_at = NOW()
       WHERE id = $1`,
      [lobbyId, names[index], index + 1],
    );
  }
}
