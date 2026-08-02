import type { PredictionAdminMatch } from "../services/prediction-repository";

export type PredictionMatchDraft = {
  teamAKey: string;
  teamBKey: string;
  time: string;
  isLocked: boolean;
};

const defaultTimes = ["12:00", "15:00", "18:00"];

export function predictionTimeValue(startsAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(startsAt));
}

export function predictionDraftsForDate(
  matches: PredictionAdminMatch[],
  dateKey: string,
): PredictionMatchDraft[] {
  const matchesForDate = matches.filter((match) => match.moscowDate === dateKey);
  return defaultTimes.map((time, index) => {
    const match = matchesForDate.find((item) => item.position === index + 1);
    return match ? {
      teamAKey: match.teamA.key,
      teamBKey: match.teamB.key,
      time: predictionTimeValue(match.startsAt),
      isLocked: match.actualScore !== null,
    } : { teamAKey: "", teamBKey: "", time, isLocked: false };
  });
}

export function predictionMatchCountForDate(
  matches: PredictionAdminMatch[],
  dateKey: string,
): 2 | 3 {
  return matches.filter((match) => match.moscowDate === dateKey).length === 2 ? 2 : 3;
}

export function groupPredictionMatchesByDate(matches: PredictionAdminMatch[]) {
  const groups = new Map<string, PredictionAdminMatch[]>();
  for (const match of matches) {
    const group = groups.get(match.moscowDate) ?? [];
    group.push(match);
    groups.set(match.moscowDate, group);
  }
  return [...groups.entries()].map(([dateKey, dayMatches]) => ({
    dateKey,
    matches: dayMatches.sort((left, right) => left.position - right.position),
  }));
}

