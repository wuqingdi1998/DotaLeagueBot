import { transaction } from "@/lib/db";
import {
  hasActiveSeries,
  lockDraftPlayers,
} from "@/app/fearless-draft/server/database";
import { SeasonLobbyRoomError } from "./errors";

type TransferTarget = {
  series_id: number;
  player1_id: string;
  player2_id: string;
  team_side: "a" | "b";
};

export async function transferSeasonLobbyCaptain(
  matchId: number,
  currentCaptainId: string,
  rawNewCaptainId: unknown,
): Promise<void> {
  const newCaptainId = String(rawNewCaptainId ?? "");
  if (!/^\d{5,20}$/.test(newCaptainId)) {
    throw new SeasonLobbyRoomError("Новый капитан не найден", 404);
  }
  if (newCaptainId === currentCaptainId) {
    throw new SeasonLobbyRoomError("Этот игрок уже является капитаном");
  }
  await transaction(async (client) => {
    const result = await client.query<TransferTarget>(
      `SELECT series.id::int AS series_id,
         series.player1_id::text, series.player2_id::text,
         captain.team_side
       FROM draft_series series
       JOIN season_match_rooms room ON room.match_id = series.season_match_id
       JOIN season_matches match ON match.id = series.season_match_id
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN season_match_room_players captain
         ON captain.match_id = series.season_match_id
        AND captain.player_id = $2
       WHERE series.season_match_id = $1
         AND room.status = 'drafting'
         AND series.status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
         AND match.status <> 'cancelled' AND round.is_visible = TRUE
         AND (
           (round.round_kind = 'regular'
             AND round.lobby_configuration_status = 'published')
           OR
           (round.round_kind = 'finals'
             AND match.status IN ('published', 'completed'))
         )
       FOR UPDATE OF series, room`,
      [matchId, currentCaptainId],
    );
    const target = result.rows[0];
    if (!target || ![target.player1_id, target.player2_id].includes(currentCaptainId)) {
      throw new SeasonLobbyRoomError(
        "Передать полномочия может только действующий капитан",
        403,
      );
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

    await client.query(
      `UPDATE draft_maps SET
         coin_toss_winner_id = CASE
           WHEN coin_toss_winner_id = $2 THEN $3 ELSE coin_toss_winner_id END,
         first_chooser_id = CASE
           WHEN first_chooser_id = $2 THEN $3 ELSE first_chooser_id END,
         radiant_player_id = CASE
           WHEN radiant_player_id = $2 THEN $3 ELSE radiant_player_id END,
         first_pick_player_id = CASE
           WHEN first_pick_player_id = $2 THEN $3 ELSE first_pick_player_id END,
         version = version + 1
       WHERE series_id = $1`,
      [target.series_id, currentCaptainId, newCaptainId],
    );
    await client.query(
      `UPDATE draft_actions SET actor_id = $2
       WHERE map_id IN (SELECT id FROM draft_maps WHERE series_id = $1)
         AND actor_id = $3`,
      [target.series_id, newCaptainId, currentCaptainId],
    );
    const captainColumn = currentCaptainId === target.player1_id
      ? "player1_id"
      : "player2_id";
    const dismissedColumn = currentCaptainId === target.player1_id
      ? "player1_dismissed_at"
      : "player2_dismissed_at";
    await client.query(
      `UPDATE draft_series SET
         ${captainColumn} = $2,
         ${dismissedColumn} = NULL,
         map1_coin_toss_winner_id = CASE
           WHEN map1_coin_toss_winner_id = $3 THEN $2
           ELSE map1_coin_toss_winner_id END,
         end_requested_by = CASE
           WHEN end_requested_by = $3 THEN $2 ELSE end_requested_by END,
         updated_at = NOW()
       WHERE id = $1`,
      [target.series_id, newCaptainId, currentCaptainId],
    );
    await client.query(
      `UPDATE season_match_participants
       SET is_captain = player_id = $3
       WHERE match_id = $1 AND team_side = $2`,
      [matchId, target.team_side, newCaptainId],
    );
    const roomCaptainColumn = target.team_side === "a"
      ? "team_a_captain_id"
      : "team_b_captain_id";
    await client.query(
      `UPDATE season_match_rooms
       SET ${roomCaptainColumn} = $2, updated_at = NOW()
       WHERE match_id = $1`,
      [matchId, newCaptainId],
    );
    await client.query(
      "DELETE FROM draft_presence WHERE player_id = $1",
      [currentCaptainId],
    );
  });
}
