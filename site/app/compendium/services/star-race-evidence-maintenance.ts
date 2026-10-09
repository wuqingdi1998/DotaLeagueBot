import { query } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";
import { restoreStarRaceEvidence } from "./star-race-evidence";
import { loadStarRaceCompletions, loadStarRaceProgress } from "./star-race-repository";

/** Evidence repair continues across weeks and after closing, without awarding stars. */
export async function restorePendingOctoberMatchEvidence(): Promise<{ checked: number }> {
  const quests = OCTOBER_COMPENDIUM_WEEKS.flatMap((week) => week.quests);
  const players = await query<{ player_id: string; dota_id: string }>(
    `SELECT completion.player_id::text, player.steam_id32::text AS dota_id
     FROM compendium_star_race_quest_completions completion
     JOIN players player ON player.discord_id = completion.player_id
     WHERE completion.moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25'
       AND completion.moscow_date = ANY($1::date[])
       AND NOT completion.match_evidence_complete AND completion.completed_manually_by IS NULL
       AND (completion.evidence_retry_after IS NULL OR completion.evidence_retry_after <= NOW())
       AND player.steam_id32 BETWEEN 1 AND 4294967295
     GROUP BY completion.player_id, player.steam_id32
     ORDER BY MIN(COALESCE(completion.evidence_retry_after, completion.completed_at)) LIMIT 10`,
    [quests.filter((quest) => quest.requirement?.kind === "winning-building-damage").map((quest) => quest.dateKey)],
  );
  for (const player of players) {
    await query(`UPDATE compendium_star_race_quest_completions
      SET evidence_retry_after = NOW() + INTERVAL '30 minutes'
      WHERE player_id = $1 AND moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25'
        AND NOT match_evidence_complete`, [player.player_id]);
    const [completions, progresses] = await Promise.all([
      loadStarRaceCompletions(player.player_id), loadStarRaceProgress(player.player_id),
    ]);
    await restoreStarRaceEvidence({
      user: { discordId: player.player_id, dotaId: player.dota_id } as AuthUser,
      quests, completions, progresses,
    });
  }
  return { checked: players.length };
}
