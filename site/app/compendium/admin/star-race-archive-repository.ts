import { STAR_RACE_WEEKS, starRacePhase } from "../model/star-race";
import { loadStarRaceLeaderboard } from "../services/star-race-repository";
import { one, query } from "@/lib/db";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";
import type { CompendiumStarRaceArchive } from "./types";
import { isCompendiumFinished } from "../model/lifecycle";

async function loadFinishedRaceLeaderboard(
  race: (typeof STAR_RACE_WEEKS)[number],
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
  if (!isCompendiumFinished(now)) {
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
  if (isCompendiumFinished(now)) return;
  const finishedRaces = STAR_RACE_WEEKS.filter(
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
    STAR_RACE_WEEKS.map(async (race) => {
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
