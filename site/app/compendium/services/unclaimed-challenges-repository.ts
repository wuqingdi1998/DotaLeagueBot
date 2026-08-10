import { query } from "@/lib/db";
import { BONUS_QUEST_STAR_THRESHOLD } from "../model/constants";

type PlayerRow = {
  player_id: string;
  dota_id: string;
  player_name: string;
};

type DailyQuestRow = {
  player_id: string;
  quest_id: string;
  position: number;
  hero_id: number;
};

export type UnclaimedDailyQuest = {
  id: string;
  position: number;
  heroIds: number[];
};

export type UnclaimedChallengeCandidate = {
  playerId: string;
  dotaId: string;
  playerName: string;
  dailyQuests: UnclaimedDailyQuest[];
  isStarRaceCandidate: boolean;
};

export async function loadUnclaimedChallengeCandidates(
  dateKey: string,
  shouldIncludeStarRace: boolean,
): Promise<UnclaimedChallengeCandidate[]> {
  const [players, dailyQuestRows, starRaceCompletions] = await Promise.all([
    query<PlayerRow>(
      `SELECT discord_id::text AS player_id,
         steam_id32::text AS dota_id,
         ingame_name AS player_name
       FROM players
       WHERE is_archived = FALSE
         AND steam_id32 BETWEEN 1 AND 4294967295
       ORDER BY LOWER(ingame_name), discord_id`,
    ),
    query<DailyQuestRow>(
      `SELECT quest.player_id::text,
         quest.id::text AS quest_id,
         quest.position,
         hero.hero_id
       FROM compendium_daily_quest_sets quest_set
       JOIN compendium_daily_quests quest
         ON quest.quest_set_id = quest_set.id
       JOIN players player
         ON player.discord_id = quest.player_id
        AND player.is_archived = FALSE
        AND player.steam_id32 BETWEEN 1 AND 4294967295
       LEFT JOIN LATERAL (
         SELECT reroll.id
         FROM compendium_user_quest_rerolls reroll
         WHERE reroll.daily_quest_id = quest.id
           AND reroll.player_id = quest.player_id
         ORDER BY reroll.used_at DESC, reroll.id DESC
         LIMIT 1
       ) latest_reroll ON TRUE
       JOIN LATERAL (
         SELECT reroll_hero.hero_id, reroll_hero.position
         FROM compendium_user_quest_reroll_heroes reroll_hero
         WHERE reroll_hero.reroll_id = latest_reroll.id
         UNION ALL
         SELECT original_hero.hero_id, original_hero.position
         FROM compendium_daily_quest_heroes original_hero
         WHERE original_hero.daily_quest_id = quest.id
           AND latest_reroll.id IS NULL
       ) hero ON TRUE
       WHERE quest_set.moscow_date = $1::date
         AND NOT EXISTS (
           SELECT 1
           FROM compendium_user_quest_completions completion
           WHERE completion.player_id = quest.player_id
             AND completion.daily_quest_id = quest.id
         )
         AND (
           quest.position <= 3
           OR COALESCE((
             SELECT total_stars
             FROM compendium_player_star_totals player_total
             WHERE player_total.player_id = quest.player_id
           ), 0) >= $2
         )
       ORDER BY quest.player_id, quest.position, hero.position`,
      [dateKey, BONUS_QUEST_STAR_THRESHOLD],
    ),
    shouldIncludeStarRace
      ? query<{ player_id: string }>(
          `SELECT player_id::text
           FROM compendium_star_race_quest_completions
           WHERE moscow_date = $1::date`,
          [dateKey],
        )
      : Promise.resolve([]),
  ]);

  const completedStarRacePlayerIds = new Set(
    starRaceCompletions.map((row) => row.player_id),
  );
  const questsByPlayer = new Map<string, Map<string, UnclaimedDailyQuest>>();
  for (const row of dailyQuestRows) {
    const playerQuests = questsByPlayer.get(row.player_id) ?? new Map();
    const quest = playerQuests.get(row.quest_id) ?? {
      id: row.quest_id,
      position: row.position,
      heroIds: [],
    };
    quest.heroIds.push(row.hero_id);
    playerQuests.set(row.quest_id, quest);
    questsByPlayer.set(row.player_id, playerQuests);
  }

  return players.flatMap((player) => {
    const dailyQuests = [...(questsByPlayer.get(player.player_id)?.values() ?? [])];
    const isStarRaceCandidate = shouldIncludeStarRace &&
      !completedStarRacePlayerIds.has(player.player_id);
    if (!dailyQuests.length && !isStarRaceCandidate) return [];
    return [{
      playerId: player.player_id,
      dotaId: player.dota_id,
      playerName: player.player_name,
      dailyQuests,
      isStarRaceCandidate,
    }];
  });
}

export async function loadClaimedChallengeKeys(input: {
  dateKey: string;
  dailyQuestIds: string[];
  starRacePlayerIds: string[];
}): Promise<Set<string>> {
  const [dailyRows, starRaceRows] = await Promise.all([
    input.dailyQuestIds.length
      ? query<{ claim_key: string }>(
          `SELECT 'daily:' || player_id::text || ':' || daily_quest_id::text
             AS claim_key
           FROM compendium_user_quest_completions
           WHERE daily_quest_id = ANY($1::bigint[])`,
          [input.dailyQuestIds],
        )
      : Promise.resolve([]),
    input.starRacePlayerIds.length
      ? query<{ claim_key: string }>(
          `SELECT 'star-race:' || player_id::text || ':' || moscow_date::text
             AS claim_key
           FROM compendium_star_race_quest_completions
           WHERE moscow_date = $1::date
             AND player_id = ANY($2::bigint[])`,
          [input.dateKey, input.starRacePlayerIds],
        )
      : Promise.resolve([]),
  ]);
  return new Set(
    [...dailyRows, ...starRaceRows].map((row) => row.claim_key),
  );
}
