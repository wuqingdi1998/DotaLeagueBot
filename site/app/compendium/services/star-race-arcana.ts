import { CompendiumError } from "../model/errors";
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
import {
  attachArcanaParseJob,
  finishArcanaCheck,
  loadArcanaChecks,
  loadDueArcanaChecks,
  postponeArcanaCheck,
  releaseArcanaCheck,
  reserveArcanaCheck,
  saveFinishedArcanaCheck,
  type ArcanaCheck,
} from "./star-race-arcana-repository";
import { recordStarRaceCompletion } from "./star-race-repository";

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

async function inspectParsedWin(input: {
  playerId: string;
  dotaId: string;
  dateKey: string;
  rewardStars: number;
  win: MatchingWin;
}): Promise<StarRaceQuestCompletion | null | undefined> {
  const details = await fetchOpenDotaMatchDetails(input.win.matchId);
  if (!details.hasParsed) return undefined;
  const hasPlayer = details.players.some(
    (player) => player.accountId === input.dotaId,
  );
  if (!hasPlayer) {
    throw new CompendiumError(
      "OPEN_DOTA_UNAVAILABLE",
      "OpenDota не смог определить игрока в обработанном матче.",
    );
  }
  const hasArcana = hasPlayerEquippedArcana(details, input.dotaId);
  await saveFinishedArcanaCheck({
    playerId: input.playerId,
    dateKey: input.dateKey,
    win: input.win,
    hasArcana,
  });
  return hasArcana ? recordArcanaCompletion(input) : null;
}

async function submitUnparsedWin(input: {
  playerId: string;
  dateKey: string;
  win: MatchingWin;
}): Promise<ArcanaCheck> {
  const reservation = await reserveArcanaCheck(input);
  if (!reservation.isNew) return reservation.check;
  try {
    const jobId = await requestOpenDotaMatchParse(input.win.matchId);
    await attachArcanaParseJob({
      playerId: input.playerId,
      dateKey: input.dateKey,
      matchId: input.win.matchId,
      jobId,
    });
    return { ...reservation.check, jobId };
  } catch (error) {
    await releaseArcanaCheck({
      playerId: input.playerId,
      dateKey: input.dateKey,
      matchId: input.win.matchId,
    });
    throw error;
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
  if (input.wins.length === 0) {
    throw new CompendiumError(
      "NO_MATCH",
      "За текущие сутки пока не найдена победа в рейтинговом матче.",
    );
  }
  const checks = await loadArcanaChecks(input.playerId, input.dateKey);
  const pending: ArcanaCheck[] = [];
  for (const win of input.wins) {
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
    const completion = await inspectParsedWin({ ...input, win });
    if (completion) return { completion, pendingVerification: null };
    if (completion === null) continue;
    if (saved) {
      pending.push(await postponeArcanaCheck({
        playerId: input.playerId,
        dateKey: input.dateKey,
        matchId: win.matchId,
      }));
    } else {
      pending.push(await submitUnparsedWin({
        playerId: input.playerId,
        dateKey: input.dateKey,
        win,
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

export async function processDueArcanaChecks(): Promise<{
  checked: number;
  completed: number;
  postponed: number;
}> {
  const dueChecks = await loadDueArcanaChecks();
  let completed = 0;
  let postponed = 0;
  for (const check of dueChecks) {
    const quest = starRaceQuestByDate(check.dateKey);
    if (
      !check.dotaId ||
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
      const details = await fetchOpenDotaMatchDetails(check.matchId);
      if (!details.hasParsed) {
        await postponeArcanaCheck({
          playerId: check.playerId,
          dateKey: check.dateKey,
          matchId: check.matchId,
        });
        postponed += 1;
        continue;
      }
      const hasPlayer = details.players.some(
        (player) => player.accountId === check.dotaId,
      );
      if (!hasPlayer) {
        await postponeArcanaCheck({
          playerId: check.playerId,
          dateKey: check.dateKey,
          matchId: check.matchId,
        });
        postponed += 1;
        continue;
      }
      const hasArcana = hasPlayerEquippedArcana(details, check.dotaId);
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
