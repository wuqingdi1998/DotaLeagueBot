import { query } from "@/lib/db";
import { runeChallengeAccessRoleNames } from "@/lib/subscription-roles";
import { hiddenSubscriptionRoleForDiscordId } from "@/lib/hidden-subscription-entitlements";
import { OCTOBER_COMPENDIUM_END_AT, OCTOBER_COMPENDIUM_START_AT } from "@/lib/october-compendium-schedule";
import { currentMoscowDay, moscowDateLabel } from "@/app/compendium/model/time";
import { starRaceQuestByDate } from "@/app/compendium/model/star-race";
import { dailyChallengeRewardStars } from "@/app/compendium/model/weekend-bonus";
import { CLAN_ACTIVITY_COLUMNS, rankClanDailyActivity, type ClanDailyActivity } from "../model/clan-daily-activity";
import { loadOctoberClanMembers } from "./clan-members";

type ActivityRow = {
  player_id: string;
  daily_stars: number;
  completed_positions: number[];
  has_race_completion: boolean;
  has_rune_completion: boolean;
  has_rune_access: boolean;
  has_outing_completion: boolean;
};

export async function loadClanDailyActivity(now = new Date()): Promise<ClanDailyActivity> {
  const day = currentMoscowDay(now);
  const isActive = now.getTime() >= Date.parse(OCTOBER_COMPENDIUM_START_AT) &&
    now.getTime() < Date.parse(OCTOBER_COMPENDIUM_END_AT);
  const result: ClanDailyActivity = {
    dateLabel: moscowDateLabel(day.dateKey), serverNow: now.toISOString(),
    resetsAt: day.end.toISOString(), isActive, members: [],
  };
  if (!isActive) return result;
  const members = await loadOctoberClanMembers(now);
  const rows = await query<ActivityRow>(
    `SELECT member.player_id::text,
       COALESCE((SELECT SUM(event.amount) FROM compendium_star_events event
         WHERE event.player_id = member.player_id AND event.earned_at >= $2 AND event.earned_at < $3), 0)::int AS daily_stars,
       ARRAY(SELECT quest.position::int FROM compendium_daily_quests quest
         JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
         JOIN compendium_user_quest_completions completion ON completion.daily_quest_id = quest.id
         WHERE completion.player_id = member.player_id AND quest_set.moscow_date = $4::date) AS completed_positions,
       EXISTS(SELECT 1 FROM compendium_star_race_quest_completions completion
         WHERE completion.player_id = member.player_id AND completion.moscow_date = $4::date) AS has_race_completion,
       EXISTS(SELECT 1 FROM october_compendium_rune_challenge_completions completion
         WHERE completion.player_id = member.player_id AND completion.moscow_date = $4::date) AS has_rune_completion,
       EXISTS(SELECT 1 FROM october_compendium_clan_outing_completions completion
         WHERE completion.player_id = member.player_id AND completion.moscow_date = $4::date) AS has_outing_completion,
       EXISTS(SELECT 1 FROM player_discord_roles role
         WHERE role.player_id = member.player_id AND role.role_name = ANY($5::text[])) AS has_rune_access
     FROM october_compendium_clan_members member WHERE member.player_id = ANY($1::bigint[])`,
    [members.map((member) => member.discordId), day.start, day.end, day.dateKey, runeChallengeAccessRoleNames],
  );
  const activityByPlayer = new Map(rows.map((row) => [row.player_id, row]));
  const raceQuest = starRaceQuestByDate(day.dateKey);
  const rewardStars = dailyChallengeRewardStars(day.dateKey);
  result.members = rankClanDailyActivity(members.flatMap((member) => {
    const activity = activityByPlayer.get(member.discordId);
    if (!activity) return [];
    const hasRuneAccess = activity.has_rune_access || hiddenSubscriptionRoleForDiscordId(member.discordId) !== null;
    return [{ ...member, dailyStars: Number(activity.daily_stars), quests: CLAN_ACTIVITY_COLUMNS.map((label, index) => ({
      label,
      description: index === 0 ? [raceQuest?.title, raceQuest?.description].filter(Boolean).join(". ") || "Сегодня нет задания гонки"
        : index === 4 ? "Испытание Рун" : index === 3 ? "Испытание 3 – Клановая вылазка" : `Испытание ${index}`,
      rewardStars: index === 0 ? raceQuest?.rewardStars ?? 0 : rewardStars,
      isCompleted: index === 0 ? activity.has_race_completion
        : index === 4 ? hasRuneAccess && activity.has_rune_completion
          : index === 3 ? activity.has_outing_completion : activity.completed_positions.includes(index),
      isAvailable: index === 0 ? raceQuest !== null : index === 4 ? hasRuneAccess : true,
    })) }];
  }));
  return result;
}
