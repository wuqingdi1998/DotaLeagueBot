import { calculateRankedWinSnapshot, parsePlayerPositions } from "./model";
import { fetchDotaBuffRankedMatches } from "./dotabuff";
import {
  fetchOpenDotaMatchPosition,
  fetchOpenDotaRankedMatches,
} from "./opendota";

export class SeasonRankedWinsError extends Error {}

async function fillMissingDotaBuffRoles(
  dotaId: string,
  providerMatches: Awaited<ReturnType<typeof fetchOpenDotaRankedMatches>>[],
) {
  const openDotaMatches = providerMatches.find((matches) =>
    matches.some((match) => match.source === "opendota"),
  ) ?? [];
  const openDotaMatchIds = new Set(
    openDotaMatches.map((match) => match.matchId),
  );
  const dotabuffMatches = providerMatches.flat().filter(
    (match) =>
      match.source === "dotabuff" &&
      match.won &&
      match.role === null &&
      !openDotaMatchIds.has(match.matchId),
  );
  const missingMatches = dotabuffMatches.slice(0, 3);
  let nextMatchIndex = 0;
  async function fillNextMatch(): Promise<void> {
    const match = missingMatches[nextMatchIndex];
    nextMatchIndex += 1;
    if (!match) return;
    try {
      match.role = await fetchOpenDotaMatchPosition(match.matchId, dotaId);
      match.roleConfidence = 1;
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
  ]);
  const successfulResults = providerResults.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchOpenDotaRankedMatches>>> =>
      result.status === "fulfilled",
  );
  if (!successfulResults.length) {
    throw new SeasonRankedWinsError(
      "OpenDota и DotaBuff сейчас не смогли вернуть матчи",
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

  return calculateRankedWinSnapshot({
    matches: providerMatches.flat(),
    now: now ?? new Date(),
    positions: parsedPositions,
  });
}
