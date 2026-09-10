import {
  calculateRankedWinSnapshot,
  findRankedWinsWithoutRoles,
  parsePlayerPositions,
} from "./model";
import { fetchDotaBuffRolesForMatches } from "./dotabuff";
import { fetchStratzRankedMatches } from "./stratz";

export class SeasonRankedWinsError extends Error {}

export async function calculateSeasonRankedWins({
  checkedAt,
  dotaId,
  positions,
  windowEndsAt,
}: {
  checkedAt?: Date;
  dotaId: string;
  positions: string | null;
  windowEndsAt: Date;
}) {
  const requestStartedAt = checkedAt ?? new Date();
  const parsedPositions = parsePlayerPositions(positions);
  if (!parsedPositions) {
    throw new SeasonRankedWinsError(
      "В профиле должны быть указаны основная и дополнительная позиции",
    );
  }

  let matches: Awaited<ReturnType<typeof fetchStratzRankedMatches>>;
  try {
    matches = await fetchStratzRankedMatches(dotaId, windowEndsAt);
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
    windowEndsAt,
  });
  if (winsWithoutRoles.length) {
    try {
      const dotabuffRoles = await fetchDotaBuffRolesForMatches({
        dotaId,
        matchIds: winsWithoutRoles,
      });
      matches = matches.map((match) => ({
        ...match,
        role: match.role ?? dotabuffRoles.get(match.matchId) ?? null,
      }));
    } catch (error) {
      console.warn("DotaBuff missing Stratz roles lookup failed", {
        matchesWithoutRoles: winsWithoutRoles.length,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return calculateRankedWinSnapshot({
    checkedAt: requestStartedAt,
    matches,
    positions: parsedPositions,
    windowEndsAt,
  });
}
