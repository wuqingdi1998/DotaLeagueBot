import type { AuthUser } from "@/lib/auth";
import { compendiumHeroById } from "../model/heroes";
import { evaluateStarRaceRequirement } from "../model/star-race-evaluation";
import { starRaceQuestBounds, type StarRaceQuestDefinition } from "../model/star-race";
import { fetchRecentPlayerMatches } from "./opendota";
import type { StarRaceCompletionByDate, StarRaceProgressByDate } from "./star-race-repository";
import { repairStarRaceEvidence } from "./star-race-evidence-repository";

/** Rebuilds legacy evidence only when its original saved statistic is reproduced. */
export async function restoreStarRaceEvidence(input: {
  user: AuthUser;
  quests: readonly StarRaceQuestDefinition[];
  completions: StarRaceCompletionByDate;
  progresses: StarRaceProgressByDate;
}): Promise<void> {
  if (!input.user.dotaId) return;
  const quests = input.quests.filter((quest) => {
    const completion = input.completions.get(quest.dateKey);
    return quest.requirement?.kind === "winning-building-damage" && completion &&
      !completion.isManual && !completion.hasCompleteMatchEvidence && input.progresses.has(quest.dateKey);
  });
  if (!quests.length) return;
  try {
    const earliestStart = Math.min(...quests.map((quest) => starRaceQuestBounds(quest).start.getTime()));
    const historyDays = Math.ceil((Date.now() - earliestStart) / 86_400_000) + 1;
    const matches = await fetchRecentPlayerMatches(input.user.dotaId, { historyDays });
    for (const quest of quests) {
      const completion = input.completions.get(quest.dateKey)!;
      const progress = input.progresses.get(quest.dateKey)!;
      const bounds = starRaceQuestBounds(quest);
      const evaluation = evaluateStarRaceRequirement({
        requirement: quest.requirement!, matches, dayStart: bounds.start, dayEnd: bounds.end,
        now: new Date(Math.min(Date.parse(progress.checkedAt), Date.parse(completion.completedAt))),
      });
      if (!evaluation.isComplete || evaluation.progress !== progress.current ||
        !completion.wins.every((win) => evaluation.wins.some((candidate) => candidate.matchId === win.matchId))) continue;
      if (await repairStarRaceEvidence({ playerId: input.user.discordId, dateKey: quest.dateKey, wins: evaluation.wins })) {
        input.completions.set(quest.dateKey, {
          ...completion, hasCompleteMatchEvidence: true,
          wins: evaluation.wins.map((win) => ({ hero: compendiumHeroById(win.heroId), matchId: win.matchId })),
        });
      }
    }
  } catch {
    console.warn("Legacy star race match evidence could not be restored; keeping the saved completion");
  }
}
