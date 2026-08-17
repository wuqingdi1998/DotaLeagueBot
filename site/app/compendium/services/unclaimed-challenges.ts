import { compendiumHeroById } from "../model/heroes";
import { findMatchingWin } from "../model/matches";
import { evaluateStarRaceRequirement } from "../model/star-race-evaluation";
import {
  starRaceQuestByDate,
  starRaceQuestPhase,
  type StarRaceQuestDefinition,
} from "../model/star-race";
import { currentMoscowDay } from "../model/time";
import type { MatchingWin, OpenDotaMatch } from "../model/types";
import { fetchRecentPlayerMatches } from "./opendota";
import { ensureDailyQuestSet } from "./repository";
import {
  loadClaimedChallengeKeys,
  loadUnclaimedChallengeCandidates,
  type UnclaimedChallengeCandidate,
} from "./unclaimed-challenges-repository";

const AUDIT_WAVE_SIZE = 10;
const AUDIT_WAVE_INTERVAL_MS = 15_000;
const AUDIT_MAX_ATTEMPTS = 3;

export type UnclaimedChallenge = {
  kind: "daily" | "star-race";
  title: string;
  detail: string;
  matchIds: string[];
};

export type UnclaimedChallengePlayer = {
  playerName: string;
  challenges: UnclaimedChallenge[];
};

export type UnclaimedChallengesReport = {
  dateKey: string;
  checkedCount: number;
  failedCount: number;
  players: UnclaimedChallengePlayer[];
};

type LocatedChallenge = UnclaimedChallenge & {
  claimKey: string;
  playerId: string;
  dailyQuestId: string | null;
};

type LocatedPlayer = {
  playerName: string;
  challenges: LocatedChallenge[];
};

function publicChallenge(challenge: LocatedChallenge): UnclaimedChallenge {
  return {
    kind: challenge.kind,
    title: challenge.title,
    detail: challenge.detail,
    matchIds: challenge.matchIds,
  };
}

function uniqueMatchIds(wins: MatchingWin[]): string[] {
  return [...new Set(wins.map((win) => win.matchId))];
}

function groupedNumber(value: number): string {
  return value.toLocaleString("ru-RU");
}

function unsupportedStarRaceRequirement(requirement: never): never {
  throw new Error(
    `Unsupported star-race requirement: ${JSON.stringify(requirement)}`,
  );
}

function starRaceDetail(
  quest: StarRaceQuestDefinition,
  progress: number,
  wins: MatchingWin[],
): string {
  const requirement = quest.requirement;
  if (!requirement) return "Условие выполнено";
  switch (requirement.kind) {
    case "distinct-hero-wins": {
      const heroes = wins
        .slice(0, requirement.requiredDistinctWins)
        .map((win) => compendiumHeroById(win.heroId).name);
      return `Победы на героях: ${heroes.join(", ")}`;
    }
    case "winning-building-damage":
      return `${groupedNumber(progress)} / ${groupedNumber(requirement.targetDamage)} ` +
        "урона по строениям";
    case "cumulative-ranked-win-stat": {
      const label = requirement.stat === "hero_damage"
        ? "урона героям"
        : "убийств";
      return `${groupedNumber(progress)} / ${groupedNumber(requirement.target)} ${label}`;
    }
    case "ranked-win-stat": {
      const label = requirement.stat === "hero_damage"
        ? "урона героям"
        : "убийств";
      return `${groupedNumber(requirement.minimum)} ${label}`;
    }
    case "ranked-wins":
      return `${progress} / ${requirement.requiredWins} рейтинговых побед`;
    case "arcana-equipped-ranked-win":
      return "Рейтинговая победа с Arcana";
    case "final-winner-prediction":
      return "Успешный прогноз на победителя";
    case "game-mode-win":
      return requirement.gameMode === 23
        ? "Победа в режиме Turbo"
        : `Победа в режиме игры ${requirement.gameMode}`;
  }
  return unsupportedStarRaceRequirement(requirement);
}

function findDailyChallenges(input: {
  candidate: UnclaimedChallengeCandidate;
  matches: OpenDotaMatch[];
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): LocatedChallenge[] {
  return input.candidate.dailyQuests.flatMap((quest) => {
    const win = findMatchingWin({
      matches: input.matches,
      heroIds: quest.heroIds,
      dayStart: input.dayStart,
      dayEnd: input.dayEnd,
      now: input.now,
    });
    if (!win) return [];
    return [{
      kind: "daily" as const,
      title: `Испытание ${quest.position}`,
      detail: compendiumHeroById(win.heroId).name,
      matchIds: [win.matchId],
      claimKey: `daily:${input.candidate.playerId}:${quest.id}`,
      playerId: input.candidate.playerId,
      dailyQuestId: quest.id,
    }];
  });
}

function findStarRaceChallenge(input: {
  candidate: UnclaimedChallengeCandidate;
  quest: StarRaceQuestDefinition | null;
  matches: OpenDotaMatch[];
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): LocatedChallenge | null {
  const quest = input.quest;
  if (
    !input.candidate.isStarRaceCandidate ||
    !quest?.title ||
    !quest.requirement
  ) {
    return null;
  }
  const evaluation = evaluateStarRaceRequirement({
    requirement: quest.requirement,
    matches: input.matches,
    dayStart: input.dayStart,
    dayEnd: input.dayEnd,
    now: input.now,
  });
  if (!evaluation.isComplete) return null;
  return {
    kind: "star-race",
    title: quest.title,
    detail: starRaceDetail(quest, evaluation.progress, evaluation.wins),
    matchIds: uniqueMatchIds(evaluation.wins),
    claimKey: `star-race:${input.candidate.playerId}:${quest.dateKey}`,
    playerId: input.candidate.playerId,
    dailyQuestId: null,
  };
}

async function scanCandidate(input: {
  candidate: UnclaimedChallengeCandidate;
  quest: StarRaceQuestDefinition | null;
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): Promise<LocatedPlayer> {
  const matches = await fetchRecentPlayerMatches(input.candidate.dotaId, {
    forceRefresh: true,
  });
  const sharedInput = { ...input, matches };
  const dailyChallenges = findDailyChallenges(sharedInput);
  const starRaceChallenge = findStarRaceChallenge(sharedInput);
  return {
    playerName: input.candidate.playerName,
    challenges: starRaceChallenge
      ? [...dailyChallenges, starRaceChallenge]
      : dailyChallenges,
  };
}

async function waitForNextAuditWave(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, AUDIT_WAVE_INTERVAL_MS));
}

export async function findUnclaimedChallenges(
  now: Date = new Date(),
): Promise<UnclaimedChallengesReport> {
  const day = currentMoscowDay(now);
  await ensureDailyQuestSet(day.dateKey);
  const configuredQuest = starRaceQuestByDate(day.dateKey);
  const activeStarRaceQuest = configuredQuest &&
    starRaceQuestPhase(configuredQuest, now) === "active" &&
    configuredQuest.title &&
    configuredQuest.requirement
      ? configuredQuest
      : null;
  const candidates = await loadUnclaimedChallengeCandidates(
    day.dateKey,
    activeStarRaceQuest !== null,
  );
  const locatedPlayers: LocatedPlayer[] = [];
  let failedCount = 0;
  const pendingCandidates = candidates.map((candidate) => ({
    candidate,
    attempts: 0,
  }));

  while (pendingCandidates.length) {
    const wave = pendingCandidates.splice(0, AUDIT_WAVE_SIZE);
    const results = await Promise.allSettled(
      wave.map(({ candidate }) => scanCandidate({
        candidate,
        quest: activeStarRaceQuest,
        dayStart: day.start,
        dayEnd: day.end,
        now,
      })),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        locatedPlayers.push(result.value);
        return;
      }
      const failedCandidate = wave[index];
      const attempts = failedCandidate.attempts + 1;
      if (attempts < AUDIT_MAX_ATTEMPTS) {
        pendingCandidates.push({
          candidate: failedCandidate.candidate,
          attempts,
        });
        return;
      }
      failedCount += 1;
      console.warn("Compendium challenge audit could not check a player", {
        playerId: failedCandidate.candidate.playerId,
        attempts,
        reason: result.reason instanceof Error
          ? result.reason.message
          : "unknown error",
      });
    });
    if (pendingCandidates.length) await waitForNextAuditWave();
  }

  const locatedChallenges = locatedPlayers.flatMap((player) => player.challenges);
  const claimedKeys = await loadClaimedChallengeKeys({
    dateKey: day.dateKey,
    dailyQuestIds: locatedChallenges.flatMap((challenge) =>
      challenge.dailyQuestId ? [challenge.dailyQuestId] : []
    ),
    starRacePlayerIds: locatedChallenges.flatMap((challenge) =>
      challenge.kind === "star-race" ? [challenge.playerId] : []
    ),
  });
  const players = locatedPlayers.flatMap((player) => {
    const challenges = player.challenges
      .filter((challenge) => !claimedKeys.has(challenge.claimKey))
      .map(publicChallenge);
    return challenges.length ? [{ playerName: player.playerName, challenges }] : [];
  });

  return {
    dateKey: day.dateKey,
    checkedCount: locatedPlayers.length,
    failedCount,
    players,
  };
}
