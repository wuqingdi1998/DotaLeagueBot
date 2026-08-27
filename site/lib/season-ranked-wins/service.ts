import {
  calculateRankedWinSnapshot,
  findRankedWinsWithoutRoles,
  parsePlayerPositions,
} from "./model";
import { fetchStratzRankedMatches } from "./stratz";

export class SeasonRankedWinsError extends Error {}

export async function calculateSeasonRankedWins({
  dotaId,
  now,
  positions,
}: {
  dotaId: string;
  now?: Date;
  positions: string | null;
}) {
  const requestStartedAt = now ?? new Date();
  const parsedPositions = parsePlayerPositions(positions);
  if (!parsedPositions) {
    throw new SeasonRankedWinsError(
      "В профиле должны быть указаны основная и дополнительная позиции",
    );
  }

  let matches: Awaited<ReturnType<typeof fetchStratzRankedMatches>>;
  try {
    matches = await fetchStratzRankedMatches(dotaId, requestStartedAt);
  } catch (error) {
    console.warn("Stratz ranked wins lookup failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    throw new SeasonRankedWinsError(
      "Stratz сейчас не смог вернуть рейтинговые матчи",
    );
  }

  const winsWithoutRoles = findRankedWinsWithoutRoles({
    matches,
    now: requestStartedAt,
  });
  if (winsWithoutRoles.length) {
    throw new SeasonRankedWinsError(
      `Stratz не указал роли в ${winsWithoutRoles.length} победах за последние 30 дней. Неполный результат не сохранён.`,
    );
  }

  return calculateRankedWinSnapshot({
    matches,
    now: requestStartedAt,
    positions: parsedPositions,
  });
}
