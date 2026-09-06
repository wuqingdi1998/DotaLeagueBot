import { parsePlayerPositions, SEASON_RANKED_WIN_BUTTON_TTL_MS, type RankedWinSnapshot } from "./model";
import { parseDotabuffBrowserImport } from "./browser-import";

export const RANKED_WIN_UPDATE_SOURCES = ["stratz", "dotabuff", "manual"] as const;
export type RankedWinUpdateSource = (typeof RANKED_WIN_UPDATE_SOURCES)[number];
export const MAX_MANUAL_RANKED_WINS = 32_767;

export function isRankedWinCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value)
    && value >= 0 && value <= MAX_MANUAL_RANKED_WINS;
}

export function parseRankedWinUpdate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.roundId !== "number" || !Number.isSafeInteger(body.roundId) || body.roundId <= 0
    || typeof body.playerId !== "string" || !/^\d{1,19}$/.test(body.playerId)
    || BigInt(body.playerId) > BigInt("9223372036854775807")
    || !RANKED_WIN_UPDATE_SOURCES.includes(body.source as RankedWinUpdateSource)) return null;
  const positions = typeof body.positions === "string" ? parsePlayerPositions(body.positions) : null;
  if (!positions || positions.primaryRole === positions.secondaryRole) return null;
  if (body.source === "manual" && (!isRankedWinCount(body.primaryWins) || !isRankedWinCount(body.secondaryWins))) return null;
  const browserImport = body.browserImport === undefined ? undefined : parseDotabuffBrowserImport(body.browserImport);
  if (browserImport === null || (browserImport && body.source !== "dotabuff")) return null;
  return {
    roundId: body.roundId, playerId: body.playerId,
    source: body.source as RankedWinUpdateSource,
    positions: body.positions as string,
    primaryWins: body.primaryWins as number,
    secondaryWins: body.secondaryWins as number,
    ...(browserImport ? { browserImport } : {}),
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
