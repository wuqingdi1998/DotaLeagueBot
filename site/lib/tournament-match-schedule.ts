type ScheduleStage = {
  stage_name: string;
};

type PostseasonSide = "upper" | "lower" | "grand_final";

export function limitedMatchStage(value: string) {
  return value.slice(0, 100);
}

export function filterTournamentMatchSchedule<T extends ScheduleStage>(
  schedule: T[],
  stage: "group" | "postseason",
): T[] {
  return schedule.filter(({ stage_name }) => {
    const normalized = stage_name.toLocaleLowerCase("ru-RU");
    const isGroupStage =
      normalized.includes("груп") || normalized.includes("group");
    if (stage === "group") return isGroupStage;
    return ["плей", "сетк", "финал", "playoff", "upper", "lower"].some(
      (fragment) => normalized.includes(fragment),
    );
  });
}

export function postseasonScheduleRow<T extends ScheduleStage>(
  schedule: T[],
  bracketSide: PostseasonSide,
  fallbackIndex: number,
): T | undefined {
  if (bracketSide !== "grand_final") return schedule[fallbackIndex];
  return (
    schedule.find(({ stage_name }) => /финал|final/i.test(stage_name)) ??
    schedule[fallbackIndex]
  );
}
