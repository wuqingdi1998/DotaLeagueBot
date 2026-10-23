import type { SeasonData } from "../model/season-types";
import { leagueExcelSheets } from "../model/league-excel";
import { fetchSeasonRequest } from "./season-request";

export async function downloadLeagueExcel(slug: string, title: string) {
  const response = await fetchSeasonRequest(`/api/season?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Не удалось загрузить таблицу лиги");
  const season: SeasonData = await response.json();
  if (!season.isOrganizer) throw new Error("Необходим доступ организатора");
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  const blob = await writeExcelFile(leagueExcelSheets(title, season)).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug.replace(/[^a-zA-Z0-9_-]/g, "_")}-table.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
