import type { PoolClient } from "pg";
import { hasActiveSeries, lockDraftPlayers } from "@/app/fearless-draft/server/database";
import { replaceSeasonDraftCaptain } from "./captain-replacement";

type RoomPlayer = { player_id: string; source_player_id: string; team_side: "a" | "b" };
type Series = { id: number; player1_id: string; player2_id: string };

async function roomPlayers(client: PoolClient, matchId: number) {
  const result = await client.query<RoomPlayer>(
    `SELECT player_id::text, source_player_id::text, team_side
     FROM season_match_room_players WHERE match_id = $1`,
    [matchId],
  );
  return result.rows;
}

/** Serializes roster edits with the transition to the next draft map. */
export async function lockSeasonSubstitutionRoster(client: PoolClient, matchId: number) {
  const series = await client.query<Series>(
    `SELECT id::int, player1_id::text, player2_id::text
     FROM draft_series WHERE season_match_id = $1 FOR UPDATE`,
    [matchId],
  );
  await client.query(
    "SELECT match_id FROM season_match_rooms WHERE match_id = $1 FOR UPDATE",
    [matchId],
  );
  const match = await client.query<{ status: string; best_of: number }>(
    "SELECT status, best_of::int FROM season_matches WHERE id = $1 FOR UPDATE",
    [matchId],
  );
  if (!match.rows[0]) throw new Response("Матч не найден", { status: 404 });
  return {
    matchId,
    isClosed: ["completed", "cancelled"].includes(match.rows[0].status),
    bestOf: match.rows[0].best_of,
    series: series.rows[0],
    players: await roomPlayers(client, matchId),
  };
}

/** Reconciles captain and host rights after creating, correcting or removing a substitution. */
export async function syncSeasonSubstitutionRoster(
  client: PoolClient,
  before: Awaited<ReturnType<typeof lockSeasonSubstitutionRoster>>,
) {
  if (before.isClosed) return;
  const players = await roomPlayers(client, before.matchId);
  let hasChanges = false;
  for (const previous of before.players) {
    const next = players.find((player) => player.source_player_id === previous.source_player_id);
    if (!next || next.player_id === previous.player_id) continue;
    hasChanges = true;
    const series = before.series;
    if (series && [series.player1_id, series.player2_id].includes(previous.player_id)) {
      await lockDraftPlayers(client, [previous.player_id, next.player_id]);
      if (await hasActiveSeries(client, next.player_id)) {
        throw new Response("Игрок замены уже является капитаном в другом драфте", { status: 409 });
      }
      await replaceSeasonDraftCaptain(
        client, before.matchId, series, next.team_side, previous.player_id, next.player_id,
      );
      if (series.player1_id === previous.player_id) series.player1_id = next.player_id;
      else series.player2_id = next.player_id;
    }
    await client.query(
      `UPDATE season_matches SET host_player_id = $3, updated_at = NOW()
       WHERE id = $1 AND host_player_id = $2`,
      [before.matchId, previous.player_id, next.player_id],
    );
    await client.query(
      "DELETE FROM season_match_room_presence WHERE match_id = $1 AND player_id = $2",
      [before.matchId, previous.player_id],
    );
  }
  if (hasChanges && before.series) {
    await client.query(
      `UPDATE draft_series SET player1_ready_for_next_map = FALSE,
         player2_ready_for_next_map = FALSE, updated_at = NOW()
       WHERE id = $1`,
      [before.series.id],
    );
  }
}
