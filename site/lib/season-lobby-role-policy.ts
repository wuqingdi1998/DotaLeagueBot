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

/** A stronger player costs more to move, especially to an undeclared role. */
export function seasonLobbyRoleBurden(
  player: DeclaredRoles & { tierSnapshot: number },
  assignedRole: number,
): number {
  if (assignedRole === player.primaryRole) return 0;
  const tier = Math.max(0, Math.round(player.tierSnapshot));
  if (assignedRole === player.secondaryRole) {
    const crossesCoreSupport = player.primaryRole !== null &&
      (player.primaryRole <= 3) !== (assignedRole <= 3);
    return crossesCoreSupport ? 10 + tier * 2 : 4 + tier;
  }
  return 20 + tier * 2;
}
