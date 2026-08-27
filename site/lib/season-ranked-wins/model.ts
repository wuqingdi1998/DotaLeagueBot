export const SEASON_PRIMARY_ROLE_WINS_REQUIRED = 10;
export const SEASON_SECONDARY_ROLE_WINS_REQUIRED = 4;
export const SEASON_RANKED_WIN_WINDOW_DAYS = 30;
export const SEASON_RANKED_WIN_BUTTON_TTL_MS = 5 * 60 * 1_000;

export type DotaPosition = 1 | 2 | 3 | 4 | 5;

export type RankedMatchCandidate = {
  matchId: string;
  role: DotaPosition | null;
  startedAt: Date;
  won: boolean;
};

export type RankedWinSnapshot = {
  primaryRole: DotaPosition;
  secondaryRole: DotaPosition;
  primaryWins: number;
  secondaryWins: number;
  checkedAt: string;
  availableUntil: string;
};

export function parsePlayerPositions(positions: string | null): {
  primaryRole: DotaPosition;
  secondaryRole: DotaPosition;
} | null {
  const [primaryValue, secondaryValue] = positions?.split("/") ?? [];
  const primaryRole = Number(primaryValue);
  const secondaryRole = Number(secondaryValue);
  if (!isDotaPosition(primaryRole) || !isDotaPosition(secondaryRole)) {
    return null;
  }
  return { primaryRole, secondaryRole };
}

export function calculateRankedWinSnapshot({
  matches,
  now,
  positions,
}: {
  matches: RankedMatchCandidate[];
  now: Date;
  positions: { primaryRole: DotaPosition; secondaryRole: DotaPosition };
}): RankedWinSnapshot {
  const uniqueMatches = mergeRankedWinsInWindow({ matches, now });

  let primaryWins = 0;
  let secondaryWins = 0;
  for (const match of uniqueMatches.values()) {
    if (match.role === positions.primaryRole) primaryWins += 1;
    else if (match.role === positions.secondaryRole) secondaryWins += 1;
  }

  return {
    ...positions,
    primaryWins,
    secondaryWins,
    checkedAt: now.toISOString(),
    availableUntil: new Date(
      now.getTime() + SEASON_RANKED_WIN_BUTTON_TTL_MS,
    ).toISOString(),
  };
}

export function findRankedWinsWithoutRoles({
  matches,
  now,
}: {
  matches: RankedMatchCandidate[];
  now: Date;
}): string[] {
  return [...mergeRankedWinsInWindow({ matches, now }).values()]
    .filter((match) => match.role === null)
    .map((match) => match.matchId);
}

function mergeRankedWinsInWindow({
  matches,
  now,
}: {
  matches: RankedMatchCandidate[];
  now: Date;
}): Map<string, RankedMatchCandidate> {
  const cutoff = new Date(
    now.getTime() - SEASON_RANKED_WIN_WINDOW_DAYS * 24 * 60 * 60 * 1_000,
  );
  const uniqueMatches = new Map<string, RankedMatchCandidate>();

  for (const match of matches) {
    if (!match.won || match.startedAt < cutoff || match.startedAt > now) {
      continue;
    }
    const existing = uniqueMatches.get(match.matchId);
    const hasMoreUsefulRole = existing?.role === null && match.role !== null;
    if (!existing || hasMoreUsefulRole) {
      uniqueMatches.set(match.matchId, match);
    }
  }

  return uniqueMatches;
}

export function isDotaPosition(value: number): value is DotaPosition {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}
