import { one, query } from "@/lib/db";
import { compendiumHeroById } from "../model/heroes";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";
import type { StarRaceQuestDefinition } from "../model/star-race";
import { dailyChallengeRewardStars } from "../model/weekend-bonus";
import { loadDailyQuests } from "../services/repository";
import { OCTOBER_NORMAL_ALL_PICK_START_AT } from "@/lib/october-compendium-schedule";
import { assertChallengeDate, challengeDates, historicalRewardTime } from "./challenge-date";
import type { HistoricalChallenge, HistoricalChallenges } from "./challenge-history-types";

export async function preserveChallengeDays() {
  const definitions = OCTOBER_COMPENDIUM_WEEKS.flatMap((week) => week.quests);
  await query(`INSERT INTO october_compendium_challenge_days (moscow_date, race_definition)
    SELECT (definition->>'dateKey')::date, definition
    FROM jsonb_array_elements($1::jsonb) definition
    ON CONFLICT (moscow_date) DO UPDATE SET race_definition = EXCLUDED.race_definition
      WHERE october_compendium_challenge_days.race_definition->>'requirement' IS NULL
        AND EXCLUDED.race_definition->>'requirement' IS NOT NULL`, [JSON.stringify(definitions)]);
}

export async function loadHistoricalChallenges(playerId: string, dateKey: string, now = new Date()): Promise<HistoricalChallenges> {
  assertChallengeDate(dateKey, now);
  await preserveChallengeDays();
  const rewardTime = historicalRewardTime(dateKey, now);
  const [daily, rune, outing, raceDay, raceCompletion, clanMates] = await Promise.all([
    loadDailyQuests(dateKey, playerId),
    one<{ hero_id: number | null; is_completed: boolean; is_manual: boolean }>(`
      SELECT COALESCE(completion.hero_id, selection.hero_id) AS hero_id,
        completion.id IS NOT NULL AS is_completed,
        completion.completion_source = 'manual' AS is_manual
      FROM players player
      LEFT JOIN LATERAL (
        SELECT hero_id FROM october_compendium_rune_selection_history
        WHERE player_id = player.discord_id AND selected_at <= $3::timestamptz
        ORDER BY selected_at DESC LIMIT 1
      ) selection ON TRUE
      LEFT JOIN october_compendium_rune_challenge_completions completion
        ON completion.player_id = player.discord_id AND completion.moscow_date = $2::date
      WHERE player.discord_id = $1`, [playerId, dateKey, rewardTime]),
    one<{ is_completed: boolean; is_manual: boolean }>(`SELECT id IS NOT NULL AS is_completed,
      completion_source = 'manual' AS is_manual FROM october_compendium_clan_outing_completions
      WHERE player_id = $1 AND moscow_date = $2::date`, [playerId, dateKey]),
    one<{ race_definition: StarRaceQuestDefinition }>(`SELECT race_definition
      FROM october_compendium_challenge_days WHERE moscow_date = $1::date`, [dateKey]),
    one<{ is_manual: boolean }>(`SELECT completion_source = 'manual' OR completed_manually_by IS NOT NULL AS is_manual
      FROM compendium_star_race_quest_completions WHERE player_id = $1 AND moscow_date = $2::date`, [playerId, dateKey]),
    query<{ playerId: string; playerName: string }>(`SELECT mate.player_id::text AS "playerId", player.ingame_name AS "playerName"
      FROM october_compendium_clan_members member
      JOIN october_compendium_clan_members mate ON mate.clan_id = member.clan_id AND mate.player_id <> member.player_id
      JOIN players player ON player.discord_id = mate.player_id
      WHERE member.player_id = $1 AND player.is_archived = FALSE
        AND mate.assigned_at <= $2::timestamptz ORDER BY player.ingame_name`, [playerId, rewardTime]),
  ]);
  const rewardStars = dailyChallengeRewardStars(dateKey);
  const matchModes = dateKey >= OCTOBER_NORMAL_ALL_PICK_START_AT.slice(0, 10) ? "рейтинговом или обычном All Pick" : "рейтинговом";
  const challenges: HistoricalChallenge[] = daily.map((quest) => ({
    kind: "daily", id: quest.id, title: `Испытание ${quest.position}`,
    description: `Победа в ${matchModes} матче на одном из этих героев.`,
    heroes: quest.heroes, rewardStars, isCompleted: Boolean(quest.completion),
    isManual: Boolean(quest.completion?.isManual), unavailableReason: null,
  }));
  challenges.push({
    kind: "clan_outing", id: "clan_outing", title: "Испытание 3 · Клановая вылазка",
    description: "Победа в рейтинговом или обычном All Pick матче с участником своего клана.",
    heroes: [], rewardStars, isCompleted: Boolean(outing?.is_completed), isManual: Boolean(outing?.is_manual),
    unavailableReason: clanMates.length ? null : "Нет участников клана для выбранной даты",
  }, {
    kind: "rune", id: "rune", title: "Испытание Рун",
    description: "Победа на герое, выбранном для Испытания Рун в этот день.",
    heroes: rune?.hero_id ? [compendiumHeroById(rune.hero_id)] : [], rewardStars,
    isCompleted: Boolean(rune?.is_completed), isManual: Boolean(rune?.is_manual),
    unavailableReason: rune?.hero_id ? null : "За эту дату нет сохранённого выбора героя Рун",
  });
  const race = raceDay?.race_definition;
  if (race?.requirement && race.rewardStars !== null && race.title) {
    const heroIds = "heroIds" in race.requirement ? race.requirement.heroIds ?? [] : [];
    challenges.push({ kind: "star_race", id: dateKey, title: `Испытание гонки · ${race.title}`,
      description: race.description ?? "", rewardStars: race.rewardStars, heroes: heroIds.map(compendiumHeroById),
      isCompleted: Boolean(raceCompletion), isManual: Boolean(raceCompletion?.is_manual), unavailableReason: null });
  }
  return { dateKey, dates: challengeDates(now), challenges, clanMates };
}
