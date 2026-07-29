import type { ParticipantDirectoryPlayer } from "./participants";

export type ParticipantTierOrder = "desc" | "asc";

export type ParticipantDirectoryFilters = {
  search: string;
  role: number | null;
  tier: number | null;
  tierOrder: ParticipantTierOrder;
  showArchived: boolean;
};

function compareTier(
  left: ParticipantDirectoryPlayer,
  right: ParticipantDirectoryPlayer,
  order: ParticipantTierOrder,
) {
  const leftTier = left.tier ?? (order === "desc" ? -1 : 99);
  const rightTier = right.tier ?? (order === "desc" ? -1 : 99);
  return order === "desc" ? rightTier - leftTier : leftTier - rightTier;
}

function rolePriority(player: ParticipantDirectoryPlayer, role: number | null) {
  if (!role) return 0;
  if (player.primaryRole === role) return 0;
  if (player.secondaryRole === role) return 1;
  return 2;
}

export function filterParticipantDirectory(
  players: ParticipantDirectoryPlayer[],
  filters: ParticipantDirectoryFilters,
) {
  const normalizedSearch = filters.search
    .trim()
    .toLocaleLowerCase("ru-RU");
  return players
    .filter((player) => filters.showArchived || player.kind === "registered")
    .filter((player) => {
      if (!normalizedSearch) return true;
      return [player.nickname, ...player.aliases].some((nickname) =>
        nickname.toLocaleLowerCase("ru-RU").includes(normalizedSearch),
      );
    })
    .filter(
      (player) =>
        !filters.role ||
        player.primaryRole === filters.role ||
        player.secondaryRole === filters.role,
    )
    .filter((player) => !filters.tier || player.tier === filters.tier)
    .sort((left, right) => {
      const roleDifference =
        rolePriority(left, filters.role) -
        rolePriority(right, filters.role);
      if (roleDifference) return roleDifference;
      const tierDifference = compareTier(left, right, filters.tierOrder);
      if (tierDifference) return tierDifference;
      return left.nickname.localeCompare(right.nickname, "ru-RU");
    });
}
