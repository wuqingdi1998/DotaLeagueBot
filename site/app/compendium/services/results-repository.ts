import { one } from "@/lib/db";
import type { CompendiumResultsData, PersonalCompendiumResult } from "../model/results";
import { STAR_RACE_WEEKS } from "../model/star-race";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";
import { compendiumPeriodTables, type CompendiumPeriod } from "../model/period";
import { OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";
import { loadCompendiumLeaderboard } from "./leaderboard-repository";
import { loadStarRaceLeaderboard } from "./star-race-repository";

type PersonalResultRow = {
  total_stars: number;
  daily_quest_stars: number;
  star_race_stars: number;
  prediction_stars: number;
  tournament_participation_stars: number;
};

async function loadPersonalResult(playerId: string, period: CompendiumPeriod): Promise<PersonalCompendiumResult> {
  const tables = compendiumPeriodTables(period);
  const row = await one<PersonalResultRow>(
    `SELECT COALESCE((SELECT total_stars FROM ${tables.totals} WHERE player_id = $1), 0)::int AS total_stars,
       COALESCE(SUM(amount) FILTER (WHERE history_kind IN ('quest', 'rune', 'clan_outing')), 0)::int AS daily_quest_stars,
       COALESCE(SUM(amount) FILTER (WHERE history_kind = 'star_race'), 0)::int AS star_race_stars,
       COALESCE(SUM(amount) FILTER (WHERE history_kind = 'prediction'), 0)::int AS prediction_stars,
       COALESCE(SUM(amount) FILTER (WHERE history_kind = 'admin' AND EXISTS (
         SELECT 1 FROM compendium_admin_star_adjustments adjustment
         WHERE adjustment.id::text = operation.completion_id
           AND adjustment.season_match_id IS NOT NULL
       )), 0)::int AS tournament_participation_stars
     FROM ${tables.operations} operation WHERE player_id = $1
       ${period === "october" ? "AND compendium_stars_count_for_player(player_id, earned_at)" : ""}`,
    [playerId],
  );
  const totalStars = Number(row?.total_stars ?? 0);
  const dailyQuestStars = Number(row?.daily_quest_stars ?? 0);
  const starRaceStars = Number(row?.star_race_stars ?? 0);
  const predictionStars = Number(row?.prediction_stars ?? 0);
  const tournamentParticipationStars = Number(row?.tournament_participation_stars ?? 0);
  return { totalStars, dailyQuestStars, starRaceStars, predictionStars, tournamentParticipationStars,
    otherStars: totalStars - dailyQuestStars - starRaceStars - predictionStars - tournamentParticipationStars };
}

export async function loadCompendiumResults(
  playerId?: string,
  period: CompendiumPeriod = "october",
  now: Date = new Date(),
): Promise<CompendiumResultsData> {
  const weeks = period === "october" ? OCTOBER_COMPENDIUM_WEEKS : STAR_RACE_WEEKS;
  const [community, leaderboard, raceLeaderboards, personal] = await Promise.all([
    one<{ total: number }>(`SELECT COALESCE(SUM(total_stars), 0)::int AS total FROM ${compendiumPeriodTables(period).totals}`),
    loadCompendiumLeaderboard(period),
    Promise.all(weeks.map((race) => loadStarRaceLeaderboard(race, true))),
    playerId ? loadPersonalResult(playerId, period) : Promise.resolve(null),
  ]);
  return {
    period, isFinished: period === "ti-2026" || now.getTime() >= Date.parse(OCTOBER_COMPENDIUM_END_AT),
    communityStars: Number(community?.total ?? 0), leaders: leaderboard.slice(0, 10), personal,
    races: weeks.map((race, index) => ({ id: race.id, dateLabel: race.dateLabel,
      leaders: raceLeaderboards[index].slice(0, 5), prizes: race.prizes })),
  };
}
