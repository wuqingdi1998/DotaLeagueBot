export type SeasonLobbyRoleHistory = {
  completedMatches: number;
  primaryRoleMatches: number;
};

type DeclaredRoles = {
  primaryRole: number | null;
  secondaryRole: number | null;
};

export function canFillSeasonLobbyRole(
  player: DeclaredRoles,
  assignedRole: number,
): boolean {
  const declaredRoles = [player.primaryRole, player.secondaryRole]
    .filter((role): role is number => role !== null);
  if (declaredRoles.length === 0) return true;
  if (declaredRoles.some((role) => role <= 3) &&
      declaredRoles.some((role) => role >= 4)) {
    return declaredRoles.includes(assignedRole);
  }
  return declaredRoles.some((role) =>
    (role <= 3) === (assignedRole <= 3),
  );
}

export function primaryRoleShortfall(
  history: SeasonLobbyRoleHistory | undefined,
  isPrimaryRole: boolean,
): number {
  const completedMatches = Math.max(0, history?.completedMatches ?? 0);
  const primaryRoleMatches = Math.min(
    completedMatches,
    Math.max(0, history?.primaryRoleMatches ?? 0),
  );
  const projectedMatches = completedMatches + 1;
  const projectedPrimaryMatches = primaryRoleMatches + (isPrimaryRole ? 1 : 0);
  const shortfall = Math.max(0, 7 * projectedMatches - 10 * projectedPrimaryMatches);
  return shortfall * shortfall;
}
