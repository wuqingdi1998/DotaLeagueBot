import { one } from "@/lib/db";
import type {
  CompendiumResultsData,
  PersonalCompendiumResult,
} from "../model/results";
import { communityResultForStars } from "../model/results";
import { STAR_RACE_WEEKS } from "../model/star-race";
import { loadCompendiumLeaderboard } from "./leaderboard-repository";
import { totalCommunityCompendiumStars } from "./repository";
import { loadStarRaceLeaderboard } from "./star-race-repository";

type PersonalResultRow = {
  total_stars: number;
  daily_quest_stars: number;
  star_race_stars: number;
  prediction_stars: number;
};

async function loadPersonalResult(
  playerId: string,
): Promise<PersonalCompendiumResult> {
  const row = await one<PersonalResultRow>(
    `SELECT
       COALESCE((
         SELECT total.total_stars
         FROM compendium_player_star_totals total
         WHERE total.player_id = $1
       ), 0)::int AS total_stars,
       COALESCE((
         SELECT SUM(completion.reward_amount)
         FROM compendium_user_quest_completions completion
         WHERE completion.player_id = $1
       ), 0)::int AS daily_quest_stars,
       COALESCE((
         SELECT SUM(completion.reward_amount)
         FROM compendium_star_race_quest_completions completion
         WHERE completion.player_id = $1
       ), 0)::int AS star_race_stars,
       COALESCE((
         SELECT SUM(reward.reward_amount)
         FROM compendium_prediction_rewards reward
         WHERE reward.player_id = $1
       ), 0)::int AS prediction_stars`,
    [playerId],
  );
  const totalStars = Number(row?.total_stars ?? 0);
  const dailyQuestStars = Number(row?.daily_quest_stars ?? 0);
  const starRaceStars = Number(row?.star_race_stars ?? 0);
  const predictionStars = Number(row?.prediction_stars ?? 0);
  return {
    totalStars,
    dailyQuestStars,
    starRaceStars,
    predictionStars,
    otherStars:
      totalStars - dailyQuestStars - starRaceStars - predictionStars,
  };
}

export async function loadCompendiumResults(
  playerId?: string,
): Promise<CompendiumResultsData> {
  const [communityStars, leaderboard, raceLeaderboards, personal] =
    await Promise.all([
      totalCommunityCompendiumStars(),
      loadCompendiumLeaderboard(),
      Promise.all(
        STAR_RACE_WEEKS.map((race) =>
          loadStarRaceLeaderboard(race, true),
        ),
      ),
      playerId ? loadPersonalResult(playerId) : Promise.resolve(null),
    ]);

  return {
    communityStars,
    community: communityResultForStars(communityStars),
    leaders: leaderboard.slice(0, 10),
    personal,
    races: STAR_RACE_WEEKS.map((race, index) => ({
      id: race.id,
      dateLabel: race.dateLabel,
      leaders: raceLeaderboards[index].slice(0, 5),
    })),
  };
}
