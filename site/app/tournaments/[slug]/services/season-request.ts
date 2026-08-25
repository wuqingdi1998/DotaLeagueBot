export type SeasonMutationResponse = {
  error?: string;
  id?: number;
  isCheckedIn?: boolean;
  ok?: boolean;
  requiresConfirmation?: boolean;
};

export const seasonRequestTimeoutMs = 20_000;

export async function fetchSeasonRequest(
  input: RequestInfo | URL,
  init: RequestInit,
) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    seasonRequestTimeoutMs,
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

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
