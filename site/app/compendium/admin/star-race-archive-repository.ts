import { STAR_RACE_WEEKS, starRacePhase } from "../model/star-race";
import { loadStarRaceLeaderboard } from "../services/star-race-repository";
import type { CompendiumStarRaceArchive } from "./types";

export async function loadCompendiumStarRaceArchive(
  now: Date = new Date(),
): Promise<CompendiumStarRaceArchive[]> {
  const races = await Promise.all(
    STAR_RACE_WEEKS.map(async (race) => ({
      ...race,
      phase: starRacePhase(now, true, race).phase,
      participants: await loadStarRaceLeaderboard(race, true),
    })),
  );
  return races.reverse();
}
