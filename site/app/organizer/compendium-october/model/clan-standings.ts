import type { OctoberClanMember } from "./clan-members";

export const OCTOBER_CLAN_CARD_LEADER_LIMIT = 10;

export type OctoberClanCardRow =
  | { kind: "member"; member: OctoberClanMember; position: number }
  | { kind: "ellipsis" };

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

export function octoberClanCardRows(
  members: readonly OctoberClanMember[],
  viewerDiscordId?: string,
): OctoberClanCardRow[] {
  const rankedMembers = rankOctoberClanMembers(members);
  const leaderRows: OctoberClanCardRow[] = rankedMembers
    .slice(0, OCTOBER_CLAN_CARD_LEADER_LIMIT)
    .map((member, index) => ({ kind: "member", member, position: index + 1 }));
  const viewerIndex = viewerDiscordId
    ? rankedMembers.findIndex((member) => member.discordId === viewerDiscordId)
    : -1;
  if (viewerIndex < OCTOBER_CLAN_CARD_LEADER_LIMIT) return leaderRows;
  return [
    ...leaderRows,
    { kind: "ellipsis" },
    { kind: "member", member: rankedMembers[viewerIndex], position: viewerIndex + 1 },
  ];
}
