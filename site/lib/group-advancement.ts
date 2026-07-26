export type PlayoffType =
  | "single_elimination"
  | "double_elimination";

export type GroupAdvancementSettings = {
  advance_to_playoff: number;
  advance_to_upper: number;
  advance_to_lower: number;
};

export type GroupOutcome =
  | "upper"
  | "lower"
  | "playoff"
  | "eliminated";

export function advancingTeamCount(
  settings: GroupAdvancementSettings,
  playoffType: PlayoffType,
) {
  return playoffType === "double_elimination"
    ? settings.advance_to_upper + settings.advance_to_lower
    : settings.advance_to_playoff;
}

export function groupOutcome(
  place: number,
  settings: GroupAdvancementSettings,
  playoffType: PlayoffType,
): GroupOutcome {
  if (playoffType === "single_elimination") {
    return place <= settings.advance_to_playoff
      ? "playoff"
      : "eliminated";
  }
  if (place <= settings.advance_to_upper) return "upper";
  if (
    place <=
    settings.advance_to_upper + settings.advance_to_lower
  ) {
    return "lower";
  }
  return "eliminated";
}

export function groupOutcomeLabel(outcome: GroupOutcome) {
  return {
    upper: "Верхняя сетка",
    lower: "Нижняя сетка",
    playoff: "Плей-офф",
    eliminated: "Вылет",
  }[outcome];
}
