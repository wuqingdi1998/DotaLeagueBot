export type SeasonMutationResponse = {
  error?: string;
  id?: number;
  isCheckedIn?: boolean;
  ok?: boolean;
  requiresConfirmation?: boolean;
};

export { fetchSiteRequest as fetchSeasonRequest } from "../../../../lib/site-request";

export async function readSeasonMutationResponse(
  response: Response,
): Promise<SeasonMutationResponse> {
  const responseText = await response.text();
  if (!responseText.trim()) return {};

  try {
    const result = JSON.parse(responseText) as unknown;
    return result && typeof result === "object"
      ? (result as SeasonMutationResponse)
      : {};
  } catch {
    const isHtml = /^\s*</.test(responseText);
    return {
      error: isHtml
        ? "Сервер не смог сохранить изменения"
        : responseText.trim(),
    };
  }
}
