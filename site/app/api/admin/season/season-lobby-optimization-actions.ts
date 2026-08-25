import type { PoolClient } from "pg";
import {
  MAX_SEASON_LOBBY_COUNT,
  optimizeSeasonLobbyPlayers,
  SEASON_LOBBY_SIZE,
  sortSeasonLobbyTeamByTier,
  type SeasonLobbyOptimizationPlayer,
} from "@/lib/season-lobby-optimization";
import {
  insertSeasonLobby,
  loadSeasonLobbyReferences,
  renameAndOrderSeasonLobbies,
} from "./season-lobby-configuration-store";

type RegistrationRow = {
  player_id: string;
  positions: string | null;
  tier_snapshot: number | null;
};

type AssignedPlayerRow = {
  match_id: number;
  player_id: string;
  team_side: "a" | "b";
  tier_snapshot: number | null;
  slot_number: number | null;
};

export async function optimizeSeasonLobbyConfiguration(
  client: PoolClient,
  roundId: number,
) {
  const registrations = await loadOptimizationRegistrations(client, roundId);
  if (registrations.length < SEASON_LOBBY_SIZE) {
    throw new Response(
      `Для полного лобби нужно минимум ${SEASON_LOBBY_SIZE} игроков`,
      {
        status: 409,
      },
    );
  }
  if (!registrations.every(registrationHasTier)) {
    throw new Response("У одного из игроков не указан актуальный тир", {
      status: 409,
    });
  }
  const players = registrations.map(
    ({
      player_id,
      positions,
      tier_snapshot,
    }): SeasonLobbyOptimizationPlayer => ({
      playerId: player_id,
      positions,
      tierSnapshot: tier_snapshot,
    }),
  );
  const plan = optimizeSeasonLobbyPlayers(players, MAX_SEASON_LOBBY_COUNT);

  await clearRoundLobbyAssignments(client, roundId);
  const lobbies = await resizeRoundLobbies(
    client,
    roundId,
    plan.lobbies.length,
  );
  for (const [lobbyIndex, optimizedLobby] of plan.lobbies.entries()) {
    const matchId = lobbies[lobbyIndex]?.match_id;
    if (!matchId) {
      throw new Response("В одном из лобби не создан матч", { status: 409 });
    }
    for (const placement of optimizedLobby.placements) {
      await client.query(
        `INSERT INTO season_match_participants
           (match_id, player_id, team_side, tier_snapshot, slot_number)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          matchId,
          placement.playerId,
          placement.teamSide,
          placement.tierSnapshot,
          placement.slotNumber,
        ],
      );
    }
  }
  return { reservePlayerIds: plan.reservePlayerIds };
}

export async function sortSeasonLobbyConfigurationByTier(
  client: PoolClient,
  roundId: number,
) {
  const result = await client.query<AssignedPlayerRow>(
    `SELECT participant.match_id::int, participant.player_id::text,
       participant.team_side, participant.tier_snapshot::int,
       participant.slot_number::int
     FROM season_match_participants participant
     JOIN season_matches match ON match.id = participant.match_id
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     WHERE lobby.round_id = $1
     ORDER BY participant.match_id, participant.team_side,
       participant.slot_number NULLS LAST, participant.player_id`,
    [roundId],
  );
  if (!result.rows.length) {
    throw new Response("Сначала распределите игроков по лобби", {
      status: 409,
    });
  }
  if (
    result.rows.some(
      ({ slot_number, tier_snapshot }) =>
        slot_number === null || tier_snapshot === null,
    )
  ) {
    throw new Response("Не у всех игроков указаны слот и актуальный тир", {
      status: 409,
    });
  }

  const teams = new Map<string, AssignedPlayerRow[]>();
  for (const player of result.rows) {
    const key = `${player.match_id}:${player.team_side}`;
    teams.set(key, [...(teams.get(key) ?? []), player]);
  }
  const sortedPlayers = [...teams.values()].flatMap((team) =>
    sortSeasonLobbyTeamByTier(
      team.map((player) => ({
        ...player,
        playerId: player.player_id,
        slotNumber: player.slot_number as number,
        tierSnapshot: player.tier_snapshot as number,
      })),
    ),
  );

  await client.query(
    `UPDATE season_match_participants participant
     SET slot_number = NULL
     FROM season_matches match, season_lobbies lobby
     WHERE participant.match_id = match.id
       AND match.lobby_id = lobby.id
       AND lobby.round_id = $1`,
    [roundId],
  );
  for (const player of sortedPlayers) {
    await client.query(
      `UPDATE season_match_participants
       SET slot_number = $3
       WHERE match_id = $1 AND player_id = $2`,
      [player.match_id, player.player_id, player.slotNumber],
    );
  }
}

function registrationHasTier(
  registration: RegistrationRow,
): registration is RegistrationRow & { tier_snapshot: number } {
  return registration.tier_snapshot !== null;
}

async function loadOptimizationRegistrations(
  client: PoolClient,
  roundId: number,
) {
  const result = await client.query<RegistrationRow>(
    `SELECT registration.player_id::text,
       registration.tier_snapshot::int,
       COALESCE(NULLIF(current_player.positions, ''), player.positions)
         AS positions
     FROM season_round_registrations registration
     JOIN players player ON player.discord_id = registration.player_id
     LEFT JOIN player_identity_members identity_member
       ON identity_member.player_id = registration.player_id
     LEFT JOIN player_identities identity
       ON identity.id = identity_member.identity_id
     LEFT JOIN players current_player
       ON current_player.discord_id = identity.registered_player_id
      AND current_player.is_archived = FALSE
     WHERE registration.round_id = $1
     ORDER BY registration.created_at, registration.player_id`,
    [roundId],
  );
  return result.rows;
}

async function clearRoundLobbyAssignments(
  client: PoolClient,
  roundId: number,
) {
  await client.query(
    `DELETE FROM season_match_participants participant
     USING season_matches match, season_lobbies lobby
     WHERE participant.match_id = match.id
       AND match.lobby_id = lobby.id
       AND lobby.round_id = $1`,
    [roundId],
  );
}

async function resizeRoundLobbies(
  client: PoolClient,
  roundId: number,
  targetCount: number,
) {
  const lobbies = await loadSeasonLobbyReferences(client, roundId);
  while (lobbies.length > targetCount) {
    const removedLobby = lobbies.pop();
    if (!removedLobby) break;
    await client.query("DELETE FROM season_lobbies WHERE id = $1", [
      removedLobby.id,
    ]);
  }
  while (lobbies.length < targetCount) {
    const lobbyId = await insertSeasonLobby(
      client,
      roundId,
      "Новое лобби",
      lobbies.length + 10,
    );
    lobbies.push({ id: lobbyId, match_id: null });
  }
  await renameAndOrderSeasonLobbies(
    client,
    lobbies.map(({ id }) => id),
  );
  return loadSeasonLobbyReferences(client, roundId);
}
