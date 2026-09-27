import type { OctoberClanMember } from "./clan-members";

export const OCTOBER_CLAN_CARD_LEADER_LIMIT = 10;

export function rankOctoberClanMembers(
  members: readonly OctoberClanMember[],
): OctoberClanMember[] {
  return [...members].sort((left, right) =>
    right.totalPoints - left.totalPoints
    || left.playerName.localeCompare(right.playerName, "ru"),
  );
}

export function octoberClanTotalPoints(
  members: readonly OctoberClanMember[],
): number {
  return members.reduce((total, member) => total + member.totalPoints, 0);
}
