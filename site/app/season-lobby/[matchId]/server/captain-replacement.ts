import type { PoolClient } from "pg";

export async function replaceSeasonDraftCaptain(
  client: PoolClient,
  matchId: number,
  series: { id: number; player1_id: string },
  teamSide: "a" | "b",
  currentCaptainId: string,
  newCaptainId: string,
): Promise<void> {
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
    [series.id, currentCaptainId, newCaptainId],
  );
  await client.query(
    `UPDATE draft_actions SET actor_id = $2
     WHERE map_id IN (SELECT id FROM draft_maps WHERE series_id = $1)
       AND actor_id = $3`,
    [series.id, newCaptainId, currentCaptainId],
  );
  const captainColumn = currentCaptainId === series.player1_id
    ? "player1_id"
    : "player2_id";
  const dismissedColumn = currentCaptainId === series.player1_id
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
    [series.id, newCaptainId, currentCaptainId],
  );
  await client.query(
    `UPDATE season_match_participants
     SET is_captain = player_id = $3
     WHERE match_id = $1 AND team_side = $2`,
    [matchId, teamSide, newCaptainId],
  );
  const roomCaptainColumn = teamSide === "a"
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
}
