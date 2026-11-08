import type { TournamentType } from "./tournament-type";

export type TournamentTimelineItem = {
  key: "registration" | "check-in" | "start" | "groups" | "playoffs";
  label: string;
  at: string;
  endAt?: string;
};

export function tournamentTimeline(input: {
  registrationDeadline: string | null;
  startAt: string;
  checkInMinutes: number | null;
  showStart?: boolean;
  tournamentType?: TournamentType;
  endAt?: string;
  playoffStartsOn?: string | null;
}): TournamentTimelineItem[] {
  if (input.tournamentType === "seasonal_cup") {
    if (!input.playoffStartsOn || !input.endAt) {
      return input.showStart === false ? [] : [{ key: "start", label: "Старт турнира", at: input.startAt }];
    }
    const playoffStart = `${input.playoffStartsOn}T00:00:00+03:00`;
    return [
      { key: "groups", label: "Групповой этап", at: input.startAt,
        endAt: new Date(new Date(playoffStart).getTime() - 1).toISOString() },
      { key: "playoffs", label: "Плей-офф", at: playoffStart, endAt: input.endAt },
    ];
  }
  const startTime = new Date(input.startAt).getTime();
  const timeline: TournamentTimelineItem[] = [];
  if (input.registrationDeadline && Number.isFinite(new Date(input.registrationDeadline).getTime())) {
    timeline.push({ key: "registration", label: "Регистрация до", at: input.registrationDeadline });
  }
  if (Number.isFinite(startTime) && input.checkInMinutes !== null && input.checkInMinutes > 0) {
    timeline.push({ key: "check-in", label: "Чек-ин",
      at: new Date(startTime - input.checkInMinutes * 60_000).toISOString() });
  }
  if (input.showStart !== false && Number.isFinite(startTime)) {
    timeline.push({ key: "start", label: "Старт турнира", at: input.startAt });
  }
  return timeline;
}
