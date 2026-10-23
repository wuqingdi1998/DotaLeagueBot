import type { Sheet } from "write-excel-file/universal";
import type { SeasonStanding } from "@/lib/season";
import { compareSeasonStandingPerformance } from "@/lib/season-standings-order";
import type { SeasonData } from "./season-types";

function cell(value: string | number | null, isPlayer = false) {
  return { value: value ?? undefined, align: isPlayer ? "left" as const : "center" as const };
}

/** Exports the published standings, including archived snapshots, without recalculating scores. */
export function leagueExcelSheets(title: string, season: {
  rounds: Pick<SeasonData["rounds"][number], "round_kind" | "is_visible" | "round_number">[];
  standings: SeasonStanding[];
}): Sheet<Blob>[] {
  const rounds = season.rounds.filter((round) => round.round_kind === "regular" && round.is_visible)
    .sort((left, right) => left.round_number - right.round_number);
  const headers = ["Место", "Участник", "Dota ID", "Туров", "Побед", "Ничьих", "Поражений",
    "Корректировка", "Активность", "Очки", "Доля побед", ...rounds.map((round) => `Тур ${round.round_number}`), "Причина неактивности"];

  function sheet(name: string, rows: SeasonStanding[], isRanked: boolean): Sheet<Blob> {
    return {
      sheet: name,
      stickyRowsCount: 3,
      stickyColumnsCount: 2,
      columns: headers.map((_, index) => ({ width: index === 1 || index === headers.length - 1 ? 32 : 18 })),
      data: [
        [cell(title, true)],
        [cell("Опубликованная таблица. Скрытые туры не включены.", true)],
        headers.map((value, index) => ({ ...cell(value, index === 1), fontWeight: "bold", backgroundColor: "#233747", textColor: "#FFFFFF", wrap: true })),
        ...rows.map((row, index) => [
          cell(isRanked ? index + 1 : null), cell(row.nickname, true), cell(row.dotaId),
          cell(row.playedRounds), cell(row.wins), cell(row.draws), cell(row.losses),
          cell(row.adjustmentPoints), cell(row.activityPoints), cell(row.points),
          row.winRate === null ? cell(null) : { ...cell(row.winRate), type: Number, format: "0.00%" },
          ...rounds.map((round) => {
            const result = row.rounds[String(round.round_number)];
            if (!result) return cell(null);
            if (result.outcome === "pending") return cell("Ожидается");
            if (result.outcome === "substitute") return cell("Замена");
            if (result.outcome === "suspended") return cell("Пропуск (штраф)");
            return cell(result.points);
          }),
          cell(row.inactiveReason, true),
        ]),
      ],
    };
  }

  const sheets = [sheet("Таблица лиги", season.standings.filter((row) => row.section === "active"), true)];
  const inactive = season.standings.filter((row) => row.section === "inactive").sort(compareSeasonStandingPerformance);
  if (inactive.length) sheets.push(sheet("Вне общего зачёта", inactive, false));
  return sheets;
}
