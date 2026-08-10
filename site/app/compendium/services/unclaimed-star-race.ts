import { compendiumHeroById } from "../model/heroes";
import { findDistinctMatchingWins } from "../model/matches";
import {
  starRaceQuestByDate,
  starRaceQuestPhase,
} from "../model/star-race";
import { currentMoscowDay } from "../model/time";
import { fetchRecentPlayerMatches } from "./opendota";
import {
  loadRewardedStarRacePlayerIds,
  loadUnrewardedStarRaceCandidates,
  type UnrewardedStarRaceCandidate,
} from "./unclaimed-star-race-repository";

const AUDIT_CONCURRENCY = 5;

export type UnclaimedStarRacePlayer = {
  playerName: string;
  heroName: string;
  matchId: string;
};

export type UnclaimedStarRaceReport = {
  isAvailable: boolean;
  dateKey: string;
  questTitle: string | null;
  checkedCount: number;
  failedCount: number;
  players: UnclaimedStarRacePlayer[];
};

type CandidateWin = UnclaimedStarRacePlayer & { playerId: string };

async function scanCandidate(
  candidate: UnrewardedStarRaceCandidate,
  heroIds: readonly number[],
  requiredDistinctWins: number,
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): Promise<CandidateWin | null> {
  const matches = await fetchRecentPlayerMatches(candidate.dotaId, {
    forceRefresh: true,
  });
  const wins = findDistinctMatchingWins({
    matches,
    heroIds,
    requiredDistinctWins,
    dayStart,
    dayEnd,
    now,
  });
  const win = wins?.[0];
  if (!win) return null;
  return {
    playerId: candidate.playerId,
    playerName: candidate.playerName,
    heroName: compendiumHeroById(win.heroId).name,
    matchId: win.matchId,
  };
}

export async function findUnclaimedStarRaceWins(
  now: Date = new Date(),
): Promise<UnclaimedStarRaceReport> {
  const day = currentMoscowDay(now);
  const quest = starRaceQuestByDate(day.dateKey);
  const requirement = quest?.requirement;
  if (
    !quest?.title ||
    starRaceQuestPhase(quest, now) !== "active" ||
    requirement?.kind !== "distinct-hero-wins"
  ) {
    return {
      isAvailable: false,
      dateKey: day.dateKey,
      questTitle: quest?.title ?? null,
      checkedCount: 0,
      failedCount: 0,
      players: [],
    };
  }

  const candidates = await loadUnrewardedStarRaceCandidates(day.dateKey);
  const candidateWins: CandidateWin[] = [];
  let failedCount = 0;
  for (let offset = 0; offset < candidates.length; offset += AUDIT_CONCURRENCY) {
    const batch = candidates.slice(offset, offset + AUDIT_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((candidate) => scanCandidate(
        candidate,
        requirement.heroIds,
        requirement.requiredDistinctWins,
        day.start,
        day.end,
        now,
      )),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        if (result.value) candidateWins.push(result.value);
        return;
      }
      failedCount += 1;
      console.warn("Star-race audit could not check a player", {
        playerId: batch[index].playerId,
        reason: result.reason instanceof Error
          ? result.reason.message
          : "unknown error",
      });
    });
  }

  const rewardedPlayerIds = await loadRewardedStarRacePlayerIds(
    day.dateKey,
    candidateWins.map((player) => player.playerId),
  );
  return {
    isAvailable: true,
    dateKey: day.dateKey,
    questTitle: quest.title,
    checkedCount: candidates.length,
    failedCount,
    players: candidateWins
      .filter((player) => !rewardedPlayerIds.has(player.playerId))
      .map((player) => ({
        playerName: player.playerName,
        heroName: player.heroName,
        matchId: player.matchId,
      })),
  };
}
