import { transaction } from "@/lib/db";
import type { MatchingWin } from "../model/types";

/** Repairs evidence only; the completion, stars and leaderboard stay unchanged. */
export async function repairStarRaceEvidence(input: {
  playerId: string;
  dateKey: string;
  wins: MatchingWin[];
}): Promise<boolean> {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `compendium-star-race:${input.playerId}:${input.dateKey}`,
    ]);
    const result = await client.query<{ id: string }>(
      `SELECT id::text FROM compendium_star_race_quest_completions
       WHERE player_id = $1 AND moscow_date = $2::date
         AND NOT match_evidence_complete AND completed_manually_by IS NULL
       FOR UPDATE`,
      [input.playerId, input.dateKey],
    );
    if (!result.rows.length) return false;
    const completionId = result.rows[0].id;
    await client.query("DELETE FROM compendium_star_race_quest_wins WHERE completion_id = $1", [completionId]);
    for (const [index, win] of input.wins.entries()) {
      await client.query(
        `INSERT INTO compendium_star_race_quest_wins
           (completion_id, player_id, position, hero_id, matched_match_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [completionId, input.playerId, index + 1, win.heroId, win.matchId],
      );
    }
    await client.query(
      "UPDATE compendium_star_race_quest_completions SET match_evidence_complete = TRUE WHERE id = $1",
      [completionId],
    );
    return true;
  });
}
