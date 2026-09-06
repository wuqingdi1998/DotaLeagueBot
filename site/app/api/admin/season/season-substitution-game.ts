import type { PoolClient } from "pg";
import { canSubstituteOnSecondMap } from "@/lib/season-substitution";
import { requiredId } from "./season-admin-model";

export async function resolveSubstitutionGame(
  client: PoolClient,
  matchId: number,
  body: Record<string, unknown>,
): Promise<number | null> {
  if (!body.gameId && !body.gameNumber) return null;
  const requestedId = body.gameId ? requiredId(body.gameId, "карта") : null;
  if (body.gameNumber && Number(body.gameNumber) !== 2) {
    throw new Response("Замена по ходу матча допускается только на второй карте", {
      status: 400,
    });
  }
  const games = await client.query<{
    id: number; game_number: number; status: string;
    winner_side: string | null; dota_match_id: string | null;
  }>(
    `SELECT id::int, game_number::int, status, winner_side, dota_match_id
     FROM season_match_games WHERE match_id = $1`,
    [matchId],
  );
  const secondGame = games.rows.find((game) => game.game_number === 2);
  if (requestedId && secondGame?.id !== requestedId) {
    throw new Response("Карта не соответствует второй карте этого матча", { status: 400 });
  }
  if (!canSubstituteOnSecondMap(games.rows)) {
    throw new Response("Сначала хост должен сохранить победителя и ID первой карты", {
      status: 409,
    });
  }
  if (secondGame) return secondGame.id;
  const created = await client.query<{ id: number }>(
    `INSERT INTO season_match_games (match_id, game_number, status)
     VALUES ($1, 2, 'published') RETURNING id::int`,
    [matchId],
  );
  return created.rows[0].id;
}
