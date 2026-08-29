type DraftErrorResponse = {
  error?: string;
};

type DraftResponseOptions = {
  allowEmptySuccess?: boolean;
};

export const draftRequestTimeoutMs = 20_000;

export async function fetchDraftRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    draftRequestTimeoutMs,
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function readDraftResponse<T extends object>(
  response: Response,
  fallbackError: string,
  options: DraftResponseOptions = {},
): Promise<T> {
  let responseText: string;
  try {
    responseText = await response.text();
  } catch {
    throw new Error(fallbackError);
  }

  if (!responseText.trim()) {
    if (response.ok && options.allowEmptySuccess) return {} as T;
    throw new Error(fallbackError);
  }

  let body: unknown;
  try {
    body = JSON.parse(responseText);
  } catch {
    throw new Error(fallbackError);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(fallbackError);
  }
  if (!response.ok) {
    const serverError = (body as DraftErrorResponse).error;
    throw new Error(
      typeof serverError === "string" && serverError.trim()
        ? serverError
        : fallbackError,
    );
  }
  return body as T;
}

export function draftRequestErrorMessage(
  reason: unknown,
  fallbackError: string,
): string {
  if (!(reason instanceof Error) || reason instanceof TypeError) {
    return fallbackError;
  }
  if (reason.name === "AbortError") return fallbackError;
  return reason.message.trim() || fallbackError;
}
