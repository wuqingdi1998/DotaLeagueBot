import { parsePlayerPositions, SEASON_RANKED_WIN_BUTTON_TTL_MS, type RankedWinSnapshot } from "./model";

export const RANKED_WIN_UPDATE_SOURCES = ["stratz", "manual"] as const;
export type RankedWinUpdateSource = (typeof RANKED_WIN_UPDATE_SOURCES)[number];
export const MAX_MANUAL_RANKED_WINS = 32_767;

export function isRankedWinCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value)
    && value >= 0 && value <= MAX_MANUAL_RANKED_WINS;
}

function parseRankedWinTarget(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.roundId !== "number" || !Number.isSafeInteger(body.roundId) || body.roundId <= 0
    || typeof body.playerId !== "string" || !/^\d{1,19}$/.test(body.playerId)
    || BigInt(body.playerId) > BigInt("9223372036854775807")) return null;
  return { body, roundId: body.roundId, playerId: body.playerId };
}

export function parseRankedWinWarningTarget(value: unknown) {
  const target = parseRankedWinTarget(value);
  return target
    ? { roundId: target.roundId, playerId: target.playerId }
    : null;
}

export function parseRankedWinUpdate(value: unknown) {
  const target = parseRankedWinTarget(value);
  if (!target) return null;
  const { body } = target;
  if (!RANKED_WIN_UPDATE_SOURCES.includes(body.source as RankedWinUpdateSource)) return null;
  const positions = typeof body.positions === "string" ? parsePlayerPositions(body.positions) : null;
  if (!positions || positions.primaryRole === positions.secondaryRole) return null;
  if (body.source === "manual" && (!isRankedWinCount(body.primaryWins) || !isRankedWinCount(body.secondaryWins))) return null;
  return {
    roundId: target.roundId, playerId: target.playerId,
    source: body.source as RankedWinUpdateSource,
    positions: body.positions as string,
    primaryWins: body.primaryWins as number,
    secondaryWins: body.secondaryWins as number,
  };
}

export function manualRankedWinSnapshot(
  positions: NonNullable<ReturnType<typeof parsePlayerPositions>>,
  primaryWins: number,
  secondaryWins: number,
  now: Date,
): RankedWinSnapshot {
  return { ...positions, primaryWins, secondaryWins, checkedAt: now.toISOString(),
    availableUntil: new Date(now.getTime() + SEASON_RANKED_WIN_BUTTON_TTL_MS).toISOString() };
}
