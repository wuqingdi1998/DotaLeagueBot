import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import { isSeasonPlayerDatabaseId } from "@/lib/season";
import {
  planSeasonLobbySlotDrop,
  seasonLobbySlotsAreEqual,
  type SeasonLobbySlot,
  type SeasonLobbyTeamSide,
} from "@/lib/season-lobby-assignment";
import { MAX_SEASON_LOBBY_COUNT } from "@/lib/season-lobby-optimization";
import { enumValue, requiredId } from "./season-admin-model";
import {
  insertSeasonLobby,
  loadSeasonLobbyReferences,
  renameAndOrderSeasonLobbies,
  seasonLobbyNames,
} from "./season-lobby-configuration-store";
import {
  optimizeSeasonLobbyConfiguration,
  sortSeasonLobbyConfigurationByTier,
} from "./season-lobby-optimization-actions";
import { queueSeasonLobbyPublishedAnnouncement } from
  "./season-lobby-announcement-actions";

const configurationActions = [
  "create",
  "add",
  "remove",
  "assign",
  "optimize",
  "sortTier",
  "lock",
  "edit",
  "publish",
  "unpublish",
] as const;

type ConfigurationStatus = "none" | "editing" | "locked" | "published";

type RoundConfiguration = {
  id: number;
  tournament_id: number;
  round_kind: "regular" | "finals";
  lobby_configuration_status: ConfigurationStatus;
};

type ParticipantAssignment = {
  match_id: number;
  player_id: string;
  team_side: SeasonLobbyTeamSide;
  tier_snapshot: number | null;
  slot_number: number | null;
};

async function lockRoundConfiguration(client: PoolClient, roundId: number) {
  const result = await client.query<RoundConfiguration>(
    `SELECT round.id::int, round.tournament_id::int, round.round_kind,
       round.lobby_configuration_status
     FROM season_rounds round
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     WHERE round.id = $1 AND tournament.tournament_type = 'seasonal'
     FOR UPDATE OF round`,
    [roundId],
  );
  const round = result.rows[0];
  if (!round) throw new Response("Тур не найден", { status: 404 });
  if (round.round_kind !== "regular") {
    throw new Response("Конструктор доступен только в обычном туре сезона", {
      status: 400,
    });
  }
  return round;
}

async function createConfiguration(client: PoolClient, roundId: number) {
  const existing = await loadSeasonLobbyReferences(client, roundId);
  if (existing.length) {
    throw new Response("В этом туре уже есть лобби", { status: 409 });
  }
  const names = seasonLobbyNames(2);
  await insertSeasonLobby(client, roundId, names[0], 1);
  await insertSeasonLobby(client, roundId, names[1], 2);
  await client.query(
    `UPDATE season_rounds
     SET lobby_configuration_status = 'editing', updated_at = NOW()
     WHERE id = $1`,
    [roundId],
  );
}

async function addLobby(client: PoolClient, roundId: number) {
  const lobbies = await loadSeasonLobbyReferences(client, roundId);
  if (lobbies.length < 1 || lobbies.length >= MAX_SEASON_LOBBY_COUNT) {
    throw new Response("Можно создать от одного до четырёх лобби", {
      status: 409,
    });
  }
  const newLobbyId = await insertSeasonLobby(
    client,
    roundId,
    "Новое лобби",
    lobbies.length + 10,
  );
  const orderedIds = lobbies.map((lobby) => lobby.id);
  if (lobbies.length === 2) orderedIds.splice(1, 0, newLobbyId);
  else orderedIds.push(newLobbyId);
  await renameAndOrderSeasonLobbies(client, orderedIds);
}

async function removeLobby(client: PoolClient, roundId: number) {
  const lobbies = await loadSeasonLobbyReferences(client, roundId);
  if (lobbies.length <= 1) {
    throw new Response("Одно лобби — минимальное количество", { status: 409 });
  }
  const removalIndex = lobbies.length === 3 ? 1 : lobbies.length - 1;
  await client.query("DELETE FROM season_lobbies WHERE id = $1", [
    lobbies[removalIndex].id,
  ]);
  const remainingIds = lobbies
    .filter((_, index) => index !== removalIndex)
    .map((lobby) => lobby.id);
  await renameAndOrderSeasonLobbies(client, remainingIds);
}

async function assignPlayer(
  client: PoolClient,
  roundId: number,
  body: Record<string, unknown>,
) {
  const playerId = String(body.playerId ?? "").trim();
  if (!isSeasonPlayerDatabaseId(playerId)) {
    throw new Response("Некорректно выбран игрок", { status: 400 });
  }
  const registration = await client.query<{ tier_snapshot: number }>(
    `SELECT tier_snapshot::int
     FROM season_round_registrations
     WHERE round_id = $1 AND player_id = $2`,
    [roundId, playerId],
  );
  if (!registration.rowCount || registration.rows[0].tier_snapshot === null) {
    throw new Response("Игрок не зарегистрирован на этот тур", { status: 400 });
  }

  const sourceResult = await client.query<ParticipantAssignment>(
    `SELECT participant.match_id::int, participant.player_id::text,
       participant.team_side, participant.tier_snapshot::int,
       participant.slot_number::int
     FROM season_match_participants participant
     JOIN season_matches match ON match.id = participant.match_id
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     WHERE lobby.round_id = $1 AND participant.player_id = $2`,
    [roundId, playerId],
  );
  const sourceAssignment = sourceResult.rows[0] ?? null;

  if (body.matchId === null || body.matchId === undefined) {
    await deletePlayerAssignment(client, roundId, playerId);
    return;
  }

  const matchId = requiredId(body.matchId, "матч");
  const teamSide = enumValue(body.teamSide, ["a", "b"] as const, "команда");
  const slotNumber = Number(body.slotNumber);
  if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 5) {
    throw new Response("Некорректный слот команды", { status: 400 });
  }
  const target = await client.query<{ id: number }>(
    `SELECT match.id::int
     FROM season_matches match
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     WHERE match.id = $1 AND lobby.round_id = $2`,
    [matchId, roundId],
  );
  if (!target.rowCount) {
    throw new Response("Матч не относится к выбранному туру", { status: 400 });
  }

  const destination: SeasonLobbySlot = { matchId, teamSide, slotNumber };
  const source = sourceAssignment?.slot_number
    ? {
        matchId: sourceAssignment.match_id,
        teamSide: sourceAssignment.team_side,
        slotNumber: sourceAssignment.slot_number,
      }
    : null;
  if (source && seasonLobbySlotsAreEqual(source, destination)) return;

  const occupiedResult = await client.query<ParticipantAssignment>(
    `SELECT participant.match_id::int, participant.player_id::text,
       participant.team_side, participant.tier_snapshot::int,
       participant.slot_number::int
     FROM season_match_participants participant
     JOIN season_matches match ON match.id = participant.match_id
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     WHERE lobby.round_id = $1 AND participant.match_id = $2
       AND participant.team_side = $3 AND participant.slot_number = $4`,
    [roundId, matchId, teamSide, slotNumber],
  );
  const occupiedPlayer = occupiedResult.rows[0] ?? null;

  await deletePlayerAssignment(client, roundId, playerId);
  await client.query(
    `DELETE FROM season_match_participants
     WHERE match_id = $1 AND team_side = $2 AND slot_number = $3`,
    [matchId, teamSide, slotNumber],
  );
  const placements = planSeasonLobbySlotDrop({
    destination,
    draggedPlayer: {
      playerId,
      tierSnapshot: registration.rows[0].tier_snapshot,
    },
    occupiedPlayer: occupiedPlayer
      ? {
          playerId: occupiedPlayer.player_id,
          tierSnapshot: occupiedPlayer.tier_snapshot,
        }
      : null,
    source,
  });
  for (const placement of placements) {
    await client.query(
      `INSERT INTO season_match_participants
         (match_id, player_id, team_side, tier_snapshot, slot_number)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        placement.matchId,
        placement.playerId,
        placement.teamSide,
        placement.tierSnapshot,
        placement.slotNumber,
      ],
    );
  }
}

async function deletePlayerAssignment(
  client: PoolClient,
  roundId: number,
  playerId: string,
) {
  await client.query(
    `DELETE FROM season_match_participants participant
     USING season_matches match, season_lobbies lobby
     WHERE participant.match_id = match.id
       AND match.lobby_id = lobby.id
       AND lobby.round_id = $1
       AND participant.player_id = $2`,
    [roundId, playerId],
  );
}

async function lockConfiguration(client: PoolClient, roundId: number) {
  const validation = await client.query<{
    lobby_count: number;
    complete_lobby_count: number;
  }>(
    `SELECT COUNT(*)::int AS lobby_count,
       COUNT(*) FILTER (
         WHERE match_count = 1 AND team_a_count = 5 AND team_b_count = 5
       )::int AS complete_lobby_count
     FROM (
       SELECT lobby.id,
         COUNT(DISTINCT match.id)::int AS match_count,
         COUNT(participant.player_id) FILTER (
           WHERE participant.team_side = 'a'
         )::int AS team_a_count,
         COUNT(participant.player_id) FILTER (
           WHERE participant.team_side = 'b'
         )::int AS team_b_count
       FROM season_lobbies lobby
       LEFT JOIN season_matches match ON match.lobby_id = lobby.id
       LEFT JOIN season_match_participants participant
         ON participant.match_id = match.id
       WHERE lobby.round_id = $1
       GROUP BY lobby.id
     ) lobby_state`,
    [roundId],
  );
  const state = validation.rows[0];
  if (
    !state ||
    state.lobby_count < 1 ||
    state.lobby_count > MAX_SEASON_LOBBY_COUNT ||
    state.complete_lobby_count !== state.lobby_count
  ) {
    throw new Response(
      "Перед фиксацией заполните в каждом лобби обе команды по 5 игроков",
      { status: 409 },
    );
  }
  await setConfigurationStatus(client, roundId, "locked");
}

async function setConfigurationStatus(
  client: PoolClient,
  roundId: number,
  status: ConfigurationStatus,
) {
  await client.query(
    `UPDATE season_rounds
     SET lobby_configuration_status = $2, updated_at = NOW()
     WHERE id = $1`,
    [roundId, status],
  );
}

export async function updateSeasonLobbyConfiguration(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const roundId = requiredId(body.roundId, "тур");
  const action = enumValue(
    body.action,
    configurationActions,
    "действие с лобби",
  );
  return transaction(async (client) => {
    const round = await lockRoundConfiguration(client, roundId);
    const status = round.lobby_configuration_status;

    if (action === "create") {
      if (status !== "none") {
        throw new Response("Конструктор лобби уже создан", { status: 409 });
      }
      await createConfiguration(client, roundId);
    } else if (
      ["add", "remove", "assign", "optimize", "sortTier"].includes(action)
    ) {
      if (status !== "editing") {
        throw new Response("Сначала включите редактирование лобби", {
          status: 409,
        });
      }
      if (action === "add") await addLobby(client, roundId);
      if (action === "remove") await removeLobby(client, roundId);
      if (action === "assign") await assignPlayer(client, roundId, body);
      if (action === "optimize") {
        await optimizeSeasonLobbyConfiguration(client, roundId);
      }
      if (action === "sortTier") {
        await sortSeasonLobbyConfigurationByTier(client, roundId);
      }
    } else if (action === "lock") {
      if (status !== "editing") {
        throw new Response("Лобби уже зафиксированы", { status: 409 });
      }
      await lockConfiguration(client, roundId);
    } else if (action === "edit") {
      if (status !== "locked") {
        throw new Response("Сначала отмените публикацию лобби", { status: 409 });
      }
      await setConfigurationStatus(client, roundId, "editing");
    } else if (action === "publish") {
      if (status !== "locked") {
        throw new Response("Сначала зафиксируйте лобби", { status: 409 });
      }
      await setConfigurationStatus(client, roundId, "published");
      await queueSeasonLobbyPublishedAnnouncement(client, roundId);
    } else if (action === "unpublish") {
      if (status !== "published") {
        throw new Response("Лобби сейчас не опубликованы", { status: 409 });
      }
      await setConfigurationStatus(client, roundId, "locked");
    }

    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, $3, 'season_lobby_configuration', $4, $5::jsonb)`,
      [
        round.tournament_id,
        actorDiscordId,
        action,
        String(roundId),
        JSON.stringify({ statusBefore: status }),
      ],
    );
    return { ok: true };
  });
}
