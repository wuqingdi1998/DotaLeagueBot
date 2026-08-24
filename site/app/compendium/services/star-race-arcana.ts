import { CompendiumError } from "../model/errors";
import {
  assertCompendiumActive,
  isCompendiumFinished,
} from "../model/lifecycle";
import { isArcanaHeroId } from "../model/arcana-item-ids";
import {
  starRaceQuestByDate,
  type StarRacePendingVerification,
  type StarRaceQuestCompletion,
} from "../model/star-race";
import type { MatchingWin } from "../model/types";
import {
  fetchOpenDotaMatchDetails,
  hasPlayerEquippedArcana,
  requestOpenDotaMatchParse,
} from "./opendota-match-details";
import { hasPlayerEquippedArcanaInReplay } from "./replay-arcana";
import {
  attachArcanaParseJob,
  finishArcanaCheck,
  loadArcanaChecks,
  loadDueArcanaChecks,
  postponeArcanaCheck,
  reserveArcanaCheck,
  saveFinishedArcanaCheck,
  type ArcanaCheck,
} from "./star-race-arcana-repository";
import { recordStarRaceCompletion } from "./star-race-repository";
import { fetchStratzReplayUrl } from "./stratz-replay";

export type StarRaceArcanaOutcome = {
  completion: StarRaceQuestCompletion | null;
  pendingVerification: StarRacePendingVerification | null;
};

function pendingVerification(
  checks: ArcanaCheck[],
): StarRacePendingVerification | null {
  if (checks.length === 0) return null;
  return {
    checkAfter: checks.reduce((earliest, check) =>
      check.checkAfter < earliest ? check.checkAfter : earliest,
    checks[0].checkAfter),
    matchCount: checks.length,
  };
}

async function recordArcanaCompletion(input: {
  playerId: string;
  dateKey: string;
  rewardStars: number;
  win: MatchingWin;
}): Promise<StarRaceQuestCompletion> {
  return recordStarRaceCompletion({
    playerId: input.playerId,
    dateKey: input.dateKey,
    rewardStars: input.rewardStars,
    wins: [input.win],
  });
}

type ArcanaInspection = {
  completion: StarRaceQuestCompletion | null;
  needsBackgroundCheck: boolean;
  shouldRequestOpenDotaParse: boolean;
};

async function inspectParsedWin(input: {
  playerId: string;
  dotaId: string;
  dateKey: string;
  rewardStars: number;
  win: MatchingWin;
}): Promise<ArcanaInspection> {
  let details;
  try {
    details = await fetchOpenDotaMatchDetails(input.win.matchId);
  } catch {
    return {
      completion: null,
      needsBackgroundCheck: true,
      shouldRequestOpenDotaParse: false,
    };
  }
  if (!details.hasParsed || !details.hasCosmeticData) {
    return {
      completion: null,
      needsBackgroundCheck: true,
      shouldRequestOpenDotaParse: !details.hasParsed,
    };
  }
  const hasPlayer = details.players.some(
    (player) => player.accountId === input.dotaId,
  );
  if (!hasPlayer) {
    return {
      completion: null,
      needsBackgroundCheck: true,
      shouldRequestOpenDotaParse: false,
    };
  }
  const hasArcana = hasPlayerEquippedArcana(details, input.dotaId);
  await saveFinishedArcanaCheck({
    playerId: input.playerId,
    dateKey: input.dateKey,
    win: input.win,
    hasArcana,
  });
  return {
    completion: hasArcana ? await recordArcanaCompletion(input) : null,
    needsBackgroundCheck: false,
    shouldRequestOpenDotaParse: false,
  };
}

async function submitPendingWin(input: {
  playerId: string;
  dateKey: string;
  win: MatchingWin;
  shouldRequestOpenDotaParse: boolean;
}): Promise<ArcanaCheck> {
  const reservation = await reserveArcanaCheck(input);
  if (!reservation.isNew || !input.shouldRequestOpenDotaParse) {
    return reservation.check;
  }
  try {
    const jobId = await requestOpenDotaMatchParse(input.win.matchId);
    await attachArcanaParseJob({
      playerId: input.playerId,
      dateKey: input.dateKey,
      matchId: input.win.matchId,
      jobId,
    });
    return { ...reservation.check, jobId };
  } catch {
    return reservation.check;
  }
}

export async function checkStarRaceArcanaQuest(input: {
  playerId: string;
  dotaId: string;
  dateKey: string;
  rewardStars: number;
  wins: MatchingWin[];
  now: Date;
}): Promise<StarRaceArcanaOutcome> {
  assertCompendiumActive(input.now);
  if (input.wins.length === 0) {
    throw new CompendiumError(
      "NO_MATCH",
      "За текущие сутки пока не найдена победа в рейтинговом матче.",
    );
  }
  const eligibleWins = input.wins.filter((win) => isArcanaHeroId(win.heroId));
  if (eligibleWins.length === 0) {
    throw new CompendiumError(
      "NO_MATCH",
      "За текущие сутки пока не найдена победа на герое с Arcana.",
    );
  }
  const checks = await loadArcanaChecks(input.playerId, input.dateKey);
  const pending: ArcanaCheck[] = [];
  for (const win of eligibleWins) {
    const saved = checks.get(win.matchId);
    if (saved?.finishedAt) {
      if (saved.hasArcana) {
        return {
          completion: await recordArcanaCompletion({ ...input, win }),
          pendingVerification: null,
        };
      }
      continue;
    }
    if (saved && new Date(saved.checkAfter).getTime() > input.now.getTime()) {
      pending.push(saved);
      continue;
    }
    const inspection = await inspectParsedWin({ ...input, win });
    if (inspection.completion) {
      return { completion: inspection.completion, pendingVerification: null };
    }
    if (!inspection.needsBackgroundCheck) continue;
    if (saved) {
      pending.push(await postponeArcanaCheck({
        playerId: input.playerId,
        dateKey: input.dateKey,
        matchId: win.matchId,
      }));
    } else {
      pending.push(await submitPendingWin({
        playerId: input.playerId,
        dateKey: input.dateKey,
        win,
        shouldRequestOpenDotaParse: inspection.shouldRequestOpenDotaParse,
      }));
    }
  }
  const waiting = pendingVerification(pending);
  if (waiting) return { completion: null, pendingVerification: waiting };
  throw new CompendiumError(
    "NO_MATCH",
    "В завершённых рейтинговых победах Arcana-предмет не найден.",
  );
}

export async function processDueArcanaChecks(now: Date = new Date()): Promise<{
  checked: number;
  completed: number;
  postponed: number;
}> {
  if (isCompendiumFinished(now)) {
    return { checked: 0, completed: 0, postponed: 0 };
  }
  const dueChecks = await loadDueArcanaChecks();
  let completed = 0;
  let postponed = 0;
  for (const check of dueChecks) {
    const quest = starRaceQuestByDate(check.dateKey);
    if (
      !check.dotaId ||
      !isArcanaHeroId(check.heroId) ||
      quest?.requirement?.kind !== "arcana-equipped-ranked-win" ||
      quest.rewardStars === null
    ) {
      await finishArcanaCheck({
        playerId: check.playerId,
        dateKey: check.dateKey,
        matchId: check.matchId,
        hasArcana: false,
      });
      continue;
    }
    try {
      let details = null;
      try {
        details = await fetchOpenDotaMatchDetails(check.matchId, 30_000);
      } catch {
        details = null;
      }
      let hasArcana: boolean;
      const hasReliableOpenDotaCosmetics = Boolean(
        details?.hasParsed &&
        details.hasCosmeticData &&
        details.players.some((player) => player.accountId === check.dotaId),
      );
      if (hasReliableOpenDotaCosmetics && details) {
        hasArcana = hasPlayerEquippedArcana(details, check.dotaId);
      } else {
        const replayUrl = details?.replayUrl ??
          await fetchStratzReplayUrl(check.matchId);
        if (!replayUrl) throw new Error("Replay is not available yet");
        hasArcana = await hasPlayerEquippedArcanaInReplay({
          matchId: check.matchId,
          replayUrl,
          dotaId: check.dotaId,
        });
      }
      if (hasArcana) {
        await recordArcanaCompletion({
          playerId: check.playerId,
          dateKey: check.dateKey,
          rewardStars: quest.rewardStars,
          win: {
            heroId: check.heroId,
            matchId: check.matchId,
            endedAt: new Date(),
          },
        });
        completed += 1;
      }
      await finishArcanaCheck({
        playerId: check.playerId,
        dateKey: check.dateKey,
        matchId: check.matchId,
        hasArcana,
      });
    } catch {
      await postponeArcanaCheck({
        playerId: check.playerId,
        dateKey: check.dateKey,
        matchId: check.matchId,
      });
      postponed += 1;
    }
  }
  return { checked: dueChecks.length, completed, postponed };
}
