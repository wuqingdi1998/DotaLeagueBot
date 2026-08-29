import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import { FEARLESS_DRAFT_HEROES_BY_ID } from "../model/heroes";
import { draftLobbyTeamForCaptain } from "../model/lobby-roster";
import type {
  DraftHeroSuggestion,
  DraftLobbyPlayer,
} from "../model/snapshot";
import type { DraftTeamPlayerColorSlot } from "../model/player-colors";
import { DraftRequestError } from "./errors";

const MAX_SUGGESTIONS_PER_PLAYER = 5;

type SuggestionContextRow = {
  series_id: number;
  map_id: number;
  map_number: number;
  version: number;
  is_lobby_preview: boolean;
  season_match_id: number | null;
};

async function loadSuggestionContext(
  client: PoolClient,
  playerId: string,
  seasonMatchId?: number,
): Promise<SuggestionContextRow> {
  const result = await client.query<SuggestionContextRow>(
    `SELECT series.id::int AS series_id, map.id::int AS map_id,
            map.map_number::int, map.version::int, series.is_lobby_preview,
            series.season_match_id::int
     FROM draft_series series
     JOIN draft_maps map
       ON map.series_id = series.id AND map.map_number = series.current_map
     WHERE series.status = 'DRAFTING' AND map.status = 'DRAFTING'
       AND (
         (series.is_lobby_preview = TRUE AND series.player1_id = $1)
         OR (
           $2::bigint IS NOT NULL AND series.season_match_id = $2
           AND EXISTS (
             SELECT 1 FROM season_match_room_players participant
             WHERE participant.match_id = series.season_match_id
               AND participant.player_id = $1
           )
         )
       )
     ORDER BY series.updated_at DESC
     LIMIT 1
     FOR UPDATE OF map`,
    [playerId, seasonMatchId ?? null],
  );
  const context = result.rows[0];
  if (!context) {
    throw new DraftRequestError("Предлагать героев могут только участники текущего лобби", 403);
  }
  return context;
}

async function ensureHeroAvailable(
  client: PoolClient,
  context: SuggestionContextRow,
  heroId: number,
): Promise<void> {
  const hero = FEARLESS_DRAFT_HEROES_BY_ID.get(heroId);
  if (!hero?.isCaptainModeEnabled) {
    throw new DraftRequestError("Этого героя нельзя предложить в режиме капитанов", 409);
  }
  const unavailable = await client.query(
    `SELECT 1
     FROM draft_actions action
     JOIN draft_maps action_map ON action_map.id = action.map_id
     WHERE action.hero_id = $1 AND (
       action.map_id = $2
       OR (
         action_map.series_id = $3 AND action_map.map_number < $4
         AND action.action_type = 'PICK'
       )
     )
     LIMIT 1`,
    [heroId, context.map_id, context.series_id, context.map_number],
  );
  if (unavailable.rowCount) {
    throw new DraftRequestError("Этот герой уже недоступен для выбора", 409);
  }
}

export async function toggleDraftHeroSuggestion(
  playerId: string,
  heroId: number,
  expectedVersion: number,
  seasonMatchId?: number,
): Promise<void> {
  if (!Number.isInteger(heroId) || !Number.isInteger(expectedVersion)) {
    throw new DraftRequestError("Некорректное предложение героя");
  }
  await transaction(async (client) => {
    const context = await loadSuggestionContext(client, playerId, seasonMatchId);
    if (context.version !== expectedVersion) {
      throw new DraftRequestError("Состояние драфта устарело", 409);
    }
    const existing = await client.query(
      `DELETE FROM draft_hero_suggestions
       WHERE map_id = $1 AND player_id = $2 AND hero_id = $3
       RETURNING hero_id`,
      [context.map_id, playerId, heroId],
    );
    if (existing.rowCount) return;

    await ensureHeroAvailable(client, context, heroId);
    const count = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM draft_hero_suggestions
       WHERE map_id = $1 AND player_id = $2`,
      [context.map_id, playerId],
    );
    if ((count.rows[0]?.count ?? 0) >= MAX_SUGGESTIONS_PER_PLAYER) {
      throw new DraftRequestError("Можно предложить не больше пяти героев", 409);
    }
    await client.query(
      `INSERT INTO draft_hero_suggestions(map_id, player_id, hero_id)
       VALUES ($1, $2, $3)`,
      [context.map_id, playerId, heroId],
    );
  });
}

export async function loadVisibleDraftHeroSuggestions(
  client: PoolClient,
  mapId: number,
  viewerId: string,
  lobbyPlayers: DraftLobbyPlayer[] | undefined,
  captainIds: [string, string],
): Promise<DraftHeroSuggestion[]> {
  if (!lobbyPlayers?.length) return [];
  const viewer = lobbyPlayers.find((player) => player.id === viewerId);
  if (!viewer) return [];
  const captainId = captainIds.find((id) =>
    lobbyPlayers.some((player) =>
      player.id === id && player.teamSide === viewer.teamSide,
    ),
  );
  if (!captainId) return [];
  const team = draftLobbyTeamForCaptain(lobbyPlayers, captainId).slice(0, 5);
  const colorSlots = new Map(
    team.map((player, index) => [
      player.id,
      (index + 1) as DraftTeamPlayerColorSlot,
    ]),
  );
  const result = await client.query<{ hero_id: number; player_id: string }>(
    `SELECT hero_id::int, player_id::text
     FROM draft_hero_suggestions
     WHERE map_id = $1 AND player_id = ANY($2::bigint[])
     ORDER BY created_at, player_id`,
    [mapId, team.map((player) => player.id)],
  );
  return result.rows.flatMap((row) => {
    const colorSlot = colorSlots.get(row.player_id);
    return colorSlot
      ? [{ heroId: row.hero_id, playerId: row.player_id, colorSlot }]
      : [];
  });
}
