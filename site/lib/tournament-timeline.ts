export type TournamentTimelineItem = {
  key: "registration" | "check-in" | "start";
  label: string;
  at: string;
};

export function tournamentTimeline(input: {
  registrationDeadline: string;
  startAt: string;
  checkInMinutes: number;
}): TournamentTimelineItem[] {
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
