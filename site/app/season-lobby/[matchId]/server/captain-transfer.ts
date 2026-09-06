import { transaction } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import {
  hasActiveSeries,
  lockDraftPlayers,
} from "@/app/fearless-draft/server/database";
import { replaceSeasonDraftCaptain } from "./captain-replacement";
import { SeasonLobbyRoomError } from "./errors";

type TransferTarget = {
  series_id: number;
  player1_id: string;
  player2_id: string;
  team_side: "a" | "b";
  current_captain_id: string;
};

async function changeSeasonLobbyCaptain(
  matchId: number,
  actorPlayerId: string,
  rawNewCaptainId: unknown,
  organizerTeamSide: "a" | "b" | null,
): Promise<void> {
  const newCaptainId = String(rawNewCaptainId ?? "");
  if (!/^\d{5,20}$/.test(newCaptainId)) {
    throw new SeasonLobbyRoomError("Новый капитан не найден", 404);
  }
  await transaction(async (client) => {
    const result = await client.query<TransferTarget>(
      `SELECT series.id::int AS series_id,
         series.player1_id::text, series.player2_id::text,
         captain.team_side,
         captain.player_id::text AS current_captain_id
       FROM draft_series series
       JOIN season_match_rooms room ON room.match_id = series.season_match_id
       JOIN season_matches match ON match.id = series.season_match_id
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN season_match_room_players captain
         ON captain.match_id = series.season_match_id
        AND captain.player_id = CASE
          WHEN $3::text = 'a' THEN room.team_a_captain_id
          WHEN $3::text = 'b' THEN room.team_b_captain_id
          ELSE $2::bigint
        END
       WHERE series.season_match_id = $1
         AND room.status = 'drafting'
         AND series.status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
         AND match.status NOT IN ('cancelled', 'completed')
         AND (
           $3::text IS NOT NULL
           OR (
             round.is_visible = TRUE
             AND (
               (round.round_kind = 'regular'
                 AND round.lobby_configuration_status = 'published')
               OR
               (round.round_kind = 'finals'
                 AND match.status IN ('published', 'completed'))
             )
           )
         )
       FOR UPDATE OF series, room`,
      [matchId, actorPlayerId, organizerTeamSide],
    );
    const target = result.rows[0];
    if (
      !target ||
      (!organizerTeamSide &&
        ![target.player1_id, target.player2_id].includes(actorPlayerId))
    ) {
      throw new SeasonLobbyRoomError(
        organizerTeamSide
          ? "Капитан этой команды ещё не назначен"
          : "Передать полномочия может только действующий капитан",
        403,
      );
    }
    const currentCaptainId = target.current_captain_id;
    if (newCaptainId === currentCaptainId) {
      throw new SeasonLobbyRoomError("Этот игрок уже является капитаном");
    }
    const teammate = await client.query(
      `SELECT 1 FROM season_match_room_players
       WHERE match_id = $1 AND player_id = $2 AND team_side = $3`,
      [matchId, newCaptainId, target.team_side],
    );
    if (!teammate.rowCount) {
      throw new SeasonLobbyRoomError(
        "Новым капитаном может стать только игрок вашей команды",
        403,
      );
    }
    await lockDraftPlayers(client, [currentCaptainId, newCaptainId]);
    if (await hasActiveSeries(client, newCaptainId)) {
      throw new SeasonLobbyRoomError(
        "Выбранный игрок уже участвует в другом Fearless Draft",
        409,
      );
    }

    await replaceSeasonDraftCaptain(
      client, matchId,
      { id: target.series_id, player1_id: target.player1_id },
      target.team_side, currentCaptainId, newCaptainId,
    );
  });
}

export async function transferSeasonLobbyCaptain(
  matchId: number,
  currentCaptainId: string,
  rawNewCaptainId: unknown,
): Promise<void> {
  await changeSeasonLobbyCaptain(
    matchId,
    currentCaptainId,
    rawNewCaptainId,
    null,
  );
}

export async function setSeasonLobbyCaptain(
  matchId: number,
  actor: AuthUser,
  rawTeamSide: unknown,
  rawNewCaptainId: unknown,
): Promise<void> {
  if (!actor.isAdmin) {
    throw new SeasonLobbyRoomError(
      "Менять капитана вручную может только организатор",
      403,
    );
  }
  if (rawTeamSide !== "a" && rawTeamSide !== "b") {
    throw new SeasonLobbyRoomError("Команда не найдена", 404);
  }
  await changeSeasonLobbyCaptain(
    matchId,
    actor.discordId,
    rawNewCaptainId,
    rawTeamSide,
  );
}
