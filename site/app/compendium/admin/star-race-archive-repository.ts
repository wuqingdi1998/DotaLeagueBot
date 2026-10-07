import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";
import { starRacePhase } from "../model/star-race";
import { loadStarRaceLeaderboard } from "../services/star-race-repository";
import { one, query } from "@/lib/db";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";
import type { CompendiumStarRaceArchive } from "./types";
import { OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";

function isOctoberCompendiumFinished(now: Date): boolean {
  return now.getTime() >= Date.parse(OCTOBER_COMPENDIUM_END_AT);
}

async function loadFinishedRaceLeaderboard(
  race: (typeof OCTOBER_COMPENDIUM_WEEKS)[number],
  now: Date = new Date(),
): Promise<CompendiumLeaderboardEntry[]> {
  const saved = await one<{ participants: CompendiumLeaderboardEntry[] }>(
    `SELECT participants
     FROM compendium_star_race_standings_snapshots
     WHERE race_start_at = $1::timestamptz`,
    [race.startsAt],
  );
  if (saved) return saved.participants;
  const participants = await loadStarRaceLeaderboard(race, true);
  if (!isOctoberCompendiumFinished(now)) {
    await query(
      `INSERT INTO compendium_star_race_standings_snapshots
         (race_start_at, participants)
       VALUES ($1::timestamptz, $2::jsonb)
       ON CONFLICT (race_start_at) DO NOTHING`,
      [race.startsAt, JSON.stringify(participants)],
    );
  }
  return participants;
}

export async function saveFinishedStarRaceStandings(
  now: Date = new Date(),
): Promise<void> {
  if (isOctoberCompendiumFinished(now)) return;
  const finishedRaces = OCTOBER_COMPENDIUM_WEEKS.filter(
    (race) => starRacePhase(now, true, race).phase === "finished",
  );
  await Promise.all(
    finishedRaces.map((race) => loadFinishedRaceLeaderboard(race, now)),
  );
}

export async function loadCompendiumStarRaceArchive(
  now: Date = new Date(),
): Promise<CompendiumStarRaceArchive[]> {
  const races = await Promise.all(
    OCTOBER_COMPENDIUM_WEEKS.map(async (race) => {
      const phase = starRacePhase(now, true, race).phase;
      const participants = phase === "upcoming"
          ? []
        : phase === "finished"
          ? await loadFinishedRaceLeaderboard(race, now)
          : await loadStarRaceLeaderboard(race, true);
      return { ...race, phase, participants };
    }),
  );
  return races.reverse();
}
