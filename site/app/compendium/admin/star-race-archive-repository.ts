import { STAR_RACE_WEEKS, starRacePhase } from "../model/star-race";
import { loadStarRaceLeaderboard } from "../services/star-race-repository";
import { one, query } from "@/lib/db";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";
import type { CompendiumStarRaceArchive } from "./types";

async function loadFinishedRaceLeaderboard(
  race: (typeof STAR_RACE_WEEKS)[number],
): Promise<CompendiumLeaderboardEntry[]> {
  const saved = await one<{ participants: CompendiumLeaderboardEntry[] }>(
    `SELECT participants
     FROM compendium_star_race_standings_snapshots
     WHERE race_start_at = $1::timestamptz`,
    [race.startsAt],
  );
  if (saved) return saved.participants;
  const participants = await loadStarRaceLeaderboard(race, true);
  await query(
    `INSERT INTO compendium_star_race_standings_snapshots
       (race_start_at, participants)
     VALUES ($1::timestamptz, $2::jsonb)
     ON CONFLICT (race_start_at) DO NOTHING`,
    [race.startsAt, JSON.stringify(participants)],
  );
  return participants;
}

export async function saveFinishedStarRaceStandings(
  now: Date = new Date(),
): Promise<void> {
  const finishedRaces = STAR_RACE_WEEKS.filter(
    (race) => starRacePhase(now, true, race).phase === "finished",
  );
  await Promise.all(finishedRaces.map(loadFinishedRaceLeaderboard));
}

export async function loadCompendiumStarRaceArchive(
  now: Date = new Date(),
): Promise<CompendiumStarRaceArchive[]> {
  const races = await Promise.all(
    STAR_RACE_WEEKS.map(async (race) => {
      const phase = starRacePhase(now, true, race).phase;
      const participants = phase === "upcoming"
        ? []
        : phase === "finished"
          ? await loadFinishedRaceLeaderboard(race)
          : await loadStarRaceLeaderboard(race, true);
      return { ...race, phase, participants };
    }),
  );
  return races.reverse();
}
