import type { OctoberClanMember } from "./clan-members";

export const CLAN_ACTIVITY_URL = "/api/compendium/october/clan-activity";
export const CLAN_ACTIVITY_COLUMNS = ["ГЗЗ", "И1", "И2", "И3", "ИР"] as const;

export type ClanActivityQuest = {
  label: string;
  description: string;
  rewardStars: number;
  isCompleted: boolean;
  isAvailable: boolean;
};

export type ClanDailyActivityMember = OctoberClanMember & {
  dailyStars: number;
  quests: ClanActivityQuest[];
};

export type ClanDailyActivity = {
  dateLabel: string;
  serverNow: string;
  resetsAt: string;
  isActive: boolean;
  members: ClanDailyActivityMember[];
};

export function rankClanDailyActivity(members: readonly ClanDailyActivityMember[]) {
  return members.filter((member) => member.dailyStars > 0).sort((left, right) =>
    right.dailyStars - left.dailyStars || left.playerName.localeCompare(right.playerName, "ru") ||
    left.discordId.localeCompare(right.discordId));
}
