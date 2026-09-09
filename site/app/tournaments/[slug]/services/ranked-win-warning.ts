import { fetchSeasonRequest, readSeasonMutationResponse } from "./season-request";

export async function sendRankedWinWarning(body: {
  roundId: number;
  playerId: string;
}) {
  const response = await fetchSeasonRequest(
    "/api/admin/season/ranked-win-warning",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const result = await readSeasonMutationResponse(response);
  if (!response.ok) {
    throw new Error(result.error ?? "Не удалось отправить предупреждение");
  }
  return { alreadySent: Boolean(result.alreadySent) };
}
