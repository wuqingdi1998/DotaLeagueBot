import type { PoolClient } from "pg";
import { hasActiveSeries, lockDraftPlayers } from
  "@/app/fearless-draft/server/database";
import { randomCoinTossResult } from
  "@/app/fearless-draft/server/coin-toss";
import { seasonLobbyDraftFormat } from "@/lib/season-lobby-room";
import { SeasonLobbyRoomError } from "./errors";

export async function createSeasonLobbyDraft(
  client: PoolClient,
  matchId: number,
  bestOf: number,
  captains: { teamA: string; teamB: string },
): Promise<void> {
  const { teamA, teamB } = captains;
  const format = seasonLobbyDraftFormat(bestOf);
  if (!format) throw new SeasonLobbyRoomError("Формат драфта не поддерживается", 409);
  await lockDraftPlayers(client, [teamA, teamB]);
  const existing = await client.query<{
    id: number;
    player1_id: string;
    player2_id: string;
    status: string;
  }>(
    `SELECT id::int, player1_id::text, player2_id::text, status
     FROM draft_series WHERE season_match_id = $1 FOR UPDATE`,
    [matchId],
  );
  const current = existing.rows[0];
  if (current) {
    if (current.player1_id !== teamA || current.player2_id !== teamB) {
      throw new SeasonLobbyRoomError(
        "Для этого матча уже создан Fearless Draft с другими капитанами",
        409,
      );
    }
    if (!["CHOOSING", "DRAFTING", "MAP_COMPLETE"].includes(current.status)) {
      throw new SeasonLobbyRoomError("Fearless Draft этого матча уже завершён", 409);
    }
    await activateSeasonLobbyDraft(client, matchId, teamA, teamB);
    return;
  }
  if (
    (await hasActiveSeries(client, teamA, matchId)) ||
    (await hasActiveSeries(client, teamB, matchId))
  ) {
    throw new SeasonLobbyRoomError(
      "Один из выбранных капитанов уже участвует в другом Fearless Draft",
      409,
    );
  }
  const coinToss = randomCoinTossResult([teamA, teamB]);
  const seriesResult = await client.query<{ id: number }>(
    `INSERT INTO draft_series
      (player1_id, player2_id, format, map1_coin_toss_winner_id,
       season_match_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id::int`,
    [teamA, teamB, format, coinToss.winnerId, matchId],
  );
  await client.query(
    `INSERT INTO draft_maps
      (series_id, map_number, coin_toss_winner_id,
       coin_toss_segment, first_chooser_id)
     VALUES ($1, 1, $2, $3, $2)`,
    [seriesResult.rows[0].id, coinToss.winnerId, coinToss.segment],
  );
  await activateSeasonLobbyDraft(client, matchId, teamA, teamB);
}

async function activateSeasonLobbyDraft(
  client: PoolClient,
  matchId: number,
  teamA: string,
  teamB: string,
): Promise<void> {
  await client.query(
    `UPDATE season_match_participants
     SET is_captain = CASE
       WHEN team_side = 'a' THEN player_id = $2
       ELSE player_id = $3
     END
     WHERE match_id = $1`,
    [matchId, teamA, teamB],
  );
  await client.query(
    `UPDATE season_match_rooms
     SET status = 'drafting', team_a_captain_id = $2,
       team_b_captain_id = $3, captain_stage_deadline_at = NULL,
       captain_vote_reveal_until = NULL,
       captain_reveal_next_status = NULL,
       draft_started_at = COALESCE(draft_started_at, NOW()), updated_at = NOW()
     WHERE match_id = $1`,
    [matchId, teamA, teamB],
  );
  await client.query(
    `UPDATE draft_invitations
     SET status = 'CANCELLED', responded_at = NOW()
     WHERE status = 'PENDING'
       AND (sender_id = ANY($1::bigint[]) OR recipient_id = ANY($1::bigint[]))`,
    [[teamA, teamB]],
  );
  await client.query(
    "DELETE FROM draft_queue WHERE player_id = ANY($1::bigint[])",
    [[teamA, teamB]],
  );
}
