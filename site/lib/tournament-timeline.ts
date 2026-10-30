import type { TournamentType } from "./tournament-type";

export type TournamentTimelineItem = {
  key: "registration" | "check-in" | "start" | "groups" | "playoffs";
  label: string;
  at: string;
  endAt?: string;
};

export function tournamentTimeline(input: {
  registrationDeadline: string;
  startAt: string;
  checkInMinutes: number;
  tournamentType?: TournamentType;
  endAt?: string;
  playoffStartsOn?: string | null;
}): TournamentTimelineItem[] {
  if (input.tournamentType === "seasonal_cup") {
    if (!input.playoffStartsOn || !input.endAt) {
      return [{ key: "start", label: "Старт турнира", at: input.startAt }];
    }
    const playoffStart = `${input.playoffStartsOn}T00:00:00+03:00`;
    return [
      { key: "groups", label: "Групповой этап", at: input.startAt,
        endAt: new Date(new Date(playoffStart).getTime() - 1).toISOString() },
      { key: "playoffs", label: "Плей-офф", at: playoffStart, endAt: input.endAt },
    ];
  }
  const startTime = new Date(input.startAt).getTime();
  const checkInTime =
    startTime - Math.max(0, input.checkInMinutes) * 60 * 1000;

  return [
    {
      key: "registration",
      label: "Регистрация до",
      at: input.registrationDeadline,
    },
    {
      key: "check-in",
      label: "Чек-ин",
      at: new Date(checkInTime).toISOString(),
    },
    {
      key: "start",
      label: "Старт турнира",
      at: input.startAt,
    },
  ];
}
