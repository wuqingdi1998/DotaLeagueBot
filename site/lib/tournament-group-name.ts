export function tournamentGroupLabel(group: { name: string; sort_order: number }) {
  return group.name.trim() || `Группа ${group.sort_order + 1}`;
}

export function groupSeedLabel(name: string, place: number, index: number, count: number) {
  return !name.trim() && count === 1
    ? `${place}-е место группового этапа`
    : `${place}-е место · ${name.trim() || `Группа ${index + 1}`}`;
}

export function groupMatchStage(name: string, round: number) {
  const label = name.trim();
  return ["Групповой этап", label.toLowerCase() === "групповой этап" ? "" : label, `Раунд ${round}`].filter(Boolean).join(" · ");
}
