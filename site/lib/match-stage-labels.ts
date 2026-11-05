type StageMatch = { id?: number; stage: string; stage_detail?: string | null; group_id?: number | null; bracket_side?: string | null; bracket_round?: number | null; bracket_slot?: number | null };
export function matchStageLabels(match: StageMatch, matches: StageMatch[] = []) {
  const side = match.bracket_side;
  const isGroup = side === "group" || match.group_id != null || /групп/i.test(match.stage);
  const isPlayoff = ["upper", "lower", "grand_final"].includes(side ?? "");
  if (match.stage_detail != null) return { title: match.stage, detail: match.stage_detail };
  if (isPlayoff) return { title: "Play Off", detail: side === "grand_final" ? "Гранд-финал" :
    `${side === "upper" ? "Верхняя" : "Нижняя"} сетка · Раунд ${match.bracket_round ?? 1}` };
  if (isGroup) {
    const groupMatches = matches.filter(row => row.bracket_side === "group" || row.group_id != null)
      .sort((a,b)=>(a.bracket_round??1)-(b.bracket_round??1)||(a.bracket_slot??1)-(b.bracket_slot??1)||(a.id??0)-(b.id??0));
    const number = groupMatches.findIndex(row => row.id === match.id) + 1;
    return { title: "Групповой этап", detail: `Матч ${number || match.bracket_slot || 1}` };
  }
  return { title: match.stage, detail: "" };
}
export function bracketFromStageDetail(detail: string) {
  const bracketSide = /гранд.?финал/i.test(detail) ? "grand_final" : /верхн/i.test(detail) ? "upper" : /нижн/i.test(detail) ? "lower" : "group";
  return { bracketSide, bracketRound: Number(detail.match(/раунд\s*(\d+)/i)?.[1] ?? 1), bracketSlot: null };
}
