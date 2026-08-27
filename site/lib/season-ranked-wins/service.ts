import {
  calculateRankedWinSnapshot,
  findRankedWinsWithoutRoles,
  parsePlayerPositions,
  RANKED_WIN_ROLE_CONFIDENCE,
} from "./model";
import { fetchDotaBuffRankedMatches } from "./dotabuff";
import {
  fetchOpenDotaMatchPosition,
  fetchOpenDotaRankedMatches,
} from "./opendota";
import { fetchStratzRankedMatches } from "./stratz";

export class SeasonRankedWinsError extends Error {}

async function fillMissingDotaBuffRoles(
  dotaId: string,
  providerMatches: Awaited<ReturnType<typeof fetchOpenDotaRankedMatches>>[],
) {
  const matchesWithKnownRoles = new Set(
    providerMatches
      .flat()
      .filter((match) => match.role !== null)
      .map((match) => match.matchId),
  );
  const dotabuffMatches = providerMatches.flat().filter(
    (match) =>
      match.source === "dotabuff" &&
      match.won &&
      match.role === null &&
      !matchesWithKnownRoles.has(match.matchId),
  );
  const missingMatches = dotabuffMatches.slice(0, 3);
  let nextMatchIndex = 0;
  async function fillNextMatch(): Promise<void> {
    const match = missingMatches[nextMatchIndex];
    nextMatchIndex += 1;
    if (!match) return;
    try {
      match.role = await fetchOpenDotaMatchPosition(match.matchId, dotaId);
      match.roleConfidence = RANKED_WIN_ROLE_CONFIDENCE.opendota;
    } catch {
      match.role = null;
    }
    await fillNextMatch();
  }
  await Promise.all(
    Array.from({ length: Math.min(3, missingMatches.length) }, async () => {
      try {
        await fillNextMatch();
      } catch (error) {
        console.warn("OpenDota match role lookup failed", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    }),
  );
}

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

  const providerResults = await Promise.allSettled([
    fetchOpenDotaRankedMatches(dotaId),
    fetchDotaBuffRankedMatches(dotaId, requestStartedAt),
    fetchStratzRankedMatches(dotaId, requestStartedAt),
  ]);
  const successfulResults = providerResults.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchOpenDotaRankedMatches>>> =>
      result.status === "fulfilled",
  );
  if (!successfulResults.length) {
    throw new SeasonRankedWinsError(
      "OpenDota, DotaBuff и Stratz сейчас не смогли вернуть матчи",
    );
  }
  for (const result of providerResults) {
    if (result.status === "rejected") {
      console.warn("Ranked win provider is unavailable", {
        reason: result.reason instanceof Error ? result.reason.message : "unknown",
      });
    }
  }
  const providerMatches = successfulResults.map((result) => result.value);
  await fillMissingDotaBuffRoles(dotaId, providerMatches);
  const matches = providerMatches.flat();
  const winsWithoutRoles = findRankedWinsWithoutRoles({
    matches,
    now: requestStartedAt,
  });
  if (winsWithoutRoles.length) {
    throw new SeasonRankedWinsError(
      `Не удалось надёжно определить роли в ${winsWithoutRoles.length} победах за последние 30 дней. Неполный результат не сохранён.`,
    );
  }

  return calculateRankedWinSnapshot({
    matches,
    now: requestStartedAt,
    positions: parsedPositions,
  });
}
