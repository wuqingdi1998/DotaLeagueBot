import {
  calculateRankedWinSnapshot,
  findRankedWinsWithoutRoles,
  parsePlayerPositions,
} from "./model";
import { fetchDotaBuffRolesForMatches } from "./dotabuff";
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
    matches,
    now: requestStartedAt,
    positions: parsedPositions,
  });
}
