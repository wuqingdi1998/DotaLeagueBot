import type { PredictionAdminMatch } from "../services/prediction-repository";

export type PredictionMatchDraft = {
  teamAKey: string;
  teamBKey: string;
  time: string;
  isLocked: boolean;
};

export type PredictionOpeningDraft = {
  dateKey: string;
  time: string;
};

const defaultTimes = ["12:00", "15:00", "18:00"];

function followingDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function nextAvailablePredictionDate(
  matches: PredictionAdminMatch[],
  currentDateKey: string,
): string {
  const occupiedDates = new Set(matches.map((match) => match.moscowDate));
  let candidate = followingDate(currentDateKey);
  while (occupiedDates.has(candidate)) candidate = followingDate(candidate);
  return candidate;
}

export function predictionTimeValue(startsAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(startsAt));
}

function predictionDateValue(value: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function predictionOpeningDraftForDate(
  matches: PredictionAdminMatch[],
  dateKey: string,
): PredictionOpeningDraft {
  const opensAt = matches.find((match) => match.moscowDate === dateKey)?.opensAt;
  if (!opensAt) return { dateKey, time: "00:00" };
  return {
    dateKey: predictionDateValue(opensAt),
    time: predictionTimeValue(opensAt),
  };
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
  return [...groups.entries()]
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([dateKey, dayMatches]) => ({
      dateKey,
      opensAt: dayMatches[0].opensAt,
      matches: dayMatches.sort((left, right) => left.position - right.position),
    }));
}
