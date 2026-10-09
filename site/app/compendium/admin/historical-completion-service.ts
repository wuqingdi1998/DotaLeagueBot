import { transaction } from "@/lib/db";
import { CompendiumError } from "../model/errors";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";
import { historicalRewardTime } from "./challenge-date";
import { loadHistoricalChallenges } from "./challenge-history-repository";
import type { HistoricalCompletionInput } from "./challenge-history-types";

export async function completeHistoricalChallenge(input: HistoricalCompletionInput) {
  const earnedAt = historicalRewardTime(input.dateKey, input.now);
  if (!input.matchIds.length || input.matchIds.length > 30 || input.matchIds.some((id) => !/^[1-9]\d{0,18}$/.test(id))) {
    throw new CompendiumError("STALE_QUEST", "Укажите номера матчей, учтённых для задания");
  }
  const day = await loadHistoricalChallenges(input.playerId, input.dateKey, input.now);
  const card = day.challenges.find((challenge) => challenge.kind === input.kind
    && (input.kind !== "daily" || challenge.id === input.questId));
  if (!card || card.unavailableReason) throw new CompendiumError("STALE_QUEST", card?.unavailableReason ?? "Испытание за эту дату не найдено");
  const heroId = input.kind === "rune" ? card.heroes[0]?.id : input.heroId;
  if (input.kind === "daily" && !card.heroes.some((hero) => hero.id === heroId)) {
    throw new CompendiumError("RUNE_HERO_INVALID", "Выберите героя из испытания за указанную дату");
  }
  if (input.kind === "clan_outing" && !day.clanMates.some((mate) => mate.playerId === input.partnerPlayerId)) {
    throw new CompendiumError("STALE_QUEST", "Выберите участника своего клана");
  }
  if (input.kind !== "star_race" && input.matchIds.length !== 1) {
    throw new CompendiumError("STALE_QUEST", "Для этого испытания укажите один матч");
  }
  return transaction(async (client) => {
    const lock = input.kind === "daily" ? `compendium-quest-mutation:${input.playerId}:${input.questId}`
      : input.kind === "rune" ? `compendium-rune-completion:${input.playerId}:${input.dateKey}`
      : `compendium-${input.kind === "star_race" ? "star-race" : "clan-outing"}:${input.playerId}:${input.dateKey}`;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lock]);
    const member = await client.query(`SELECT member.player_id FROM october_compendium_clan_members member
      JOIN players player ON player.discord_id = member.player_id
      WHERE member.player_id = $1 AND player.is_archived = FALSE
        AND member.assigned_at <= $2::timestamptz
        AND compendium_stars_count_for_player(member.player_id, $2::timestamptz)
      FOR UPDATE OF member`, [input.playerId, earnedAt]);
    if (!member.rowCount) throw new CompendiumError("STALE_QUEST", "Участнику недоступен зачёт за выбранную дату");
    const parameters = [input.playerId, input.dateKey, card.rewardStars, input.administratorId, earnedAt];
    let saved;
    if (input.kind === "daily") {
      saved = await client.query(`INSERT INTO compendium_user_quest_completions
        (player_id, daily_quest_id, reward_amount, completed_manually_by, completed_at,
         matched_match_id, matched_hero_id, completion_source)
        SELECT $1, quest.id, $3, $4, $5::timestamptz, $7, $8, 'manual'
        FROM compendium_daily_quests quest JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
        WHERE quest.id = $6 AND quest.player_id = $1 AND quest_set.moscow_date = $2::date
        ON CONFLICT (player_id, daily_quest_id) DO NOTHING RETURNING id`,
      [...parameters, input.questId, input.matchIds[0], heroId]);
    } else if (input.kind === "star_race") {
      saved = await client.query(`INSERT INTO compendium_star_race_quest_completions
        (player_id, moscow_date, reward_amount, completed_manually_by, completed_at, completion_source)
        VALUES ($1, $2::date, $3, $4, $5::timestamptz, 'manual')
        ON CONFLICT (player_id, moscow_date) DO NOTHING RETURNING id`, parameters);
    } else {
      const isRune = input.kind === "rune";
      if (isRune) {
        const reusedMatch = await client.query(`SELECT 1 FROM october_compendium_rune_challenge_completions
          WHERE player_id = $1 AND matched_match_id = $2 AND moscow_date <> $3::date`,
        [input.playerId, input.matchIds[0], input.dateKey]);
        if (reusedMatch.rowCount) throw new CompendiumError("STALE_QUEST", "Этот матч уже засчитан для Рун за другую дату");
      }
      const table = isRune ? "october_compendium_rune_challenge_completions" : "october_compendium_clan_outing_completions";
      const detailColumn = isRune ? "hero_id" : "partner_player_id";
      saved = await client.query(`INSERT INTO ${table}
        (player_id, moscow_date, reward_amount, completed_manually_by, completed_at,
         matched_match_id, ${detailColumn}, completion_source)
        VALUES ($1, $2::date, $3, $4, $5::timestamptz, $6, $7, 'manual')
        ON CONFLICT (player_id, moscow_date) DO NOTHING RETURNING id`,
      [...parameters, input.matchIds[0], isRune ? heroId : input.partnerPlayerId]);
    }
    if (!saved.rowCount) return { rewardStars: card.rewardStars, wasCreated: false };
    if (input.kind === "daily" || input.kind === "clan_outing") {
      await client.query(`UPDATE october_compendium_clan_members SET total_points = total_points + $2
        WHERE player_id = $1`, [input.playerId, card.rewardStars]);
    }
    await client.query(`INSERT INTO october_compendium_manual_completion_audit
      (player_id, moscow_date, challenge_kind, completion_id, administered_by, match_ids)
      VALUES ($1, $2::date, $3, $4, $5, $6::bigint[])`,
    [input.playerId, input.dateKey, input.kind, saved.rows[0].id, input.administratorId, input.matchIds]);
    const week = OCTOBER_COMPENDIUM_WEEKS.find((week) => input.dateKey >= week.id && earnedAt < new Date(week.endsAt).toISOString());
    if (week) await client.query(`DELETE FROM compendium_star_race_standings_snapshots
      WHERE race_start_at = $1::timestamptz`, [week.startsAt]);
    return { rewardStars: card.rewardStars, wasCreated: true };
  });
}
