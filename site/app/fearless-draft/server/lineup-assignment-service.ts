import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import type {
  DraftLineupAssignmentSnapshot,
  DraftLobbyPlayer,
} from "../model/snapshot";
import {
  validateDraftLineupSelection,
  type DraftLineupSelection,
} from "../model/lineup-assignment";
import { loadLockedDraftSeries } from "./database";
import { databaseNow } from "./database-clock";
import { DraftRequestError } from "./errors";

type LineupAssignmentRow = {
  captain_id: string;
  hero_id: number;
  player_id: string;
  player_name: string;
};

function captainIdsWithCompleteLineups(rows: readonly LineupAssignmentRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.captain_id, (counts.get(row.captain_id) ?? 0) + 1);
  }
  return new Set(
    [...counts].filter(([, count]) => count === 5).map(([captainId]) => captainId),
  );
}

export async function loadDraftLineupAssignment(
  client: PoolClient,
  mapId: number,
  captainIds: readonly [string, string],
  viewerId: string,
  lobbyPlayers: readonly DraftLobbyPlayer[] | undefined,
): Promise<DraftLineupAssignmentSnapshot> {
  const result = await client.query<LineupAssignmentRow>(
    `SELECT assignment.captain_id::text, assignment.hero_id::int,
            assignment.player_id::text,
            player.ingame_name AS player_name
     FROM draft_lineup_assignments assignment
     JOIN players player ON player.discord_id = assignment.player_id
     WHERE assignment.map_id = $1
     ORDER BY assignment.captain_id, assignment.hero_id`,
    [mapId],
  );
  const submittedCaptainIds = captainIdsWithCompleteLineups(result.rows);
  const isRevealed = captainIds.every((captainId) =>
    submittedCaptainIds.has(captainId)
  );
  const viewer = lobbyPlayers?.find((player) => player.id === viewerId);
  const visibleCaptainIds = isRevealed
    ? new Set(captainIds)
    : new Set(
        captainIds.filter((captainId) => {
          const captain = lobbyPlayers?.find((player) => player.id === captainId);
          return viewer && captain && viewer.teamSide === captain.teamSide;
        }),
      );
  return {
    player1Submitted: submittedCaptainIds.has(captainIds[0]),
    player2Submitted: submittedCaptainIds.has(captainIds[1]),
    isRevealed,
    assignments: result.rows
      .filter((row) => visibleCaptainIds.has(row.captain_id))
      .map((row) => ({
        captainId: row.captain_id,
        heroId: row.hero_id,
        playerId: row.player_id,
        playerName: row.player_name,
      })),
  };
}

export async function submitDraftLineupAssignment(
  captainId: string,
  assignments: readonly DraftLineupSelection[],
): Promise<void> {
  await transaction(async (client) => {
    const { series, map } = await loadLockedDraftSeries(client, captainId);
    if (!series.season_match_id || map.status !== "LINEUP_ASSIGNMENT") {
      throw new DraftRequestError("Сейчас нельзя распределять героев", 409);
    }
    const teamResult = await client.query<{ team_side: "a" | "b" }>(
      `SELECT team_side
       FROM season_match_room_players
       WHERE match_id = $1 AND player_id = $2`,
      [series.season_match_id, captainId],
    );
    const teamSide = teamResult.rows[0]?.team_side;
    if (!teamSide) {
      throw new DraftRequestError("Команда капитана не найдена", 403);
    }
    const playerResult = await client.query<{ player_id: string }>(
      `SELECT player_id::text
       FROM season_match_room_players
       WHERE match_id = $1 AND team_side = $2
       ORDER BY slot_number NULLS LAST, player_id`,
      [series.season_match_id, teamSide],
    );
    const heroResult = await client.query<{ hero_id: number }>(
      `SELECT hero_id::int
       FROM draft_actions
       WHERE map_id = $1 AND actor_id = $2
         AND action_type = 'PICK' AND hero_id IS NOT NULL
       ORDER BY step`,
      [map.id, captainId],
    );
    const validationError = validateDraftLineupSelection(
      assignments,
      heroResult.rows.map((row) => row.hero_id),
      playerResult.rows.map((row) => row.player_id),
    );
    if (validationError) throw new DraftRequestError(validationError, 400);
    const existing = await client.query(
      `SELECT 1 FROM draft_lineup_assignments
       WHERE map_id = $1 AND captain_id = $2 LIMIT 1`,
      [map.id, captainId],
    );
    if (existing.rowCount) {
      throw new DraftRequestError("Распределение уже подтверждено", 409);
    }
    const now = await databaseNow(client);
    for (const assignment of assignments) {
      await client.query(
        `INSERT INTO draft_lineup_assignments
          (map_id, captain_id, hero_id, player_id, submitted_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [map.id, captainId, assignment.heroId, assignment.playerId, now],
      );
    }
    const submittedResult = await client.query<{ captain_id: string }>(
      `SELECT captain_id::text
       FROM draft_lineup_assignments
       WHERE map_id = $1
       GROUP BY captain_id HAVING COUNT(*) = 5`,
      [map.id],
    );
    const submittedCaptainIds = new Set(
      submittedResult.rows.map((row) => row.captain_id),
    );
    const bothSubmitted = [series.player1_id, series.player2_id].every(
      (id) => submittedCaptainIds.has(id),
    );
    if (!bothSubmitted) {
      await client.query(
        `UPDATE draft_maps SET version = version + 1 WHERE id = $1`,
        [map.id],
      );
      await client.query(
        `UPDATE draft_series SET updated_at = $1 WHERE id = $2`,
        [now, series.id],
      );
      return;
    }
    await client.query(
      `UPDATE draft_maps
       SET status = 'COMPLETE', completed_at = $1, version = version + 1
       WHERE id = $2`,
      [now, map.id],
    );
    await client.query(
      `UPDATE draft_series SET status = 'MAP_COMPLETE', updated_at = $1
       WHERE id = $2`,
      [now, series.id],
    );
    await client.query(
      `UPDATE season_match_rooms SET status = 'playing', updated_at = $1
       WHERE match_id = $2`,
      [now, series.season_match_id],
    );
  });
}
