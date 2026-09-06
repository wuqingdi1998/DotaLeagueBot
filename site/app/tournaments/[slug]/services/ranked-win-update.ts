import type { RankedWinUpdateSource } from "@/lib/season-ranked-wins/organizer-model";
import type { DotabuffBrowserImport } from "@/lib/season-ranked-wins/browser-import";
import { fetchSeasonRequest, readSeasonMutationResponse } from "./season-request";

export async function saveRankedWinUpdate(body: {
  roundId: number;
  playerId: string;
  positions: string | null;
  source: RankedWinUpdateSource;
  primaryWins?: number;
  secondaryWins?: number;
  browserImport?: DotabuffBrowserImport;
}) {
  const response = await fetchSeasonRequest("/api/admin/season/ranked-wins", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await readSeasonMutationResponse(response);
  if (!response.ok) throw new Error(result.error ?? "Не удалось обновить победы");
}
