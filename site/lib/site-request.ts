export const siteReadTimeoutMs = 45_000;
export const siteMutationTimeoutMs = 90_000;
export const uncertainActionMessage =
  "Не удалось получить подтверждение от сервера. Действие могло сохраниться. Обновите данные перед повторным нажатием";
export const unavailableDataMessage =
  "Сайт временно недоступен или обновляется. Подождите немного и обновите данные";

const pendingMutations = new Map<string, Promise<Response>>();
const uploadIds = new WeakMap<Blob, number>();
let nextUploadId = 0;

function requestBodyKey(body: BodyInit | null | undefined): unknown {
  if (!(body instanceof FormData)) return body ?? null;
  return Array.from(body.entries(), ([name, value]) => {
    if (typeof value === "string") return [name, value];
    if (!uploadIds.has(value)) uploadIds.set(value, ++nextUploadId);
    return [name, { uploadId: uploadIds.get(value) }];
  });
}

function failureResponse(isMutation: boolean, status = 503): Response {
  return Response.json({
    error: isMutation ? uncertainActionMessage : unavailableDataMessage,
    outcomeUnknown: isMutation,
  }, { status });
}

async function requestJson(
  input: RequestInfo | URL,
  init: RequestInit,
  isMutation: boolean,
): Promise<Response> {
  const controller = new AbortController();
  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;
  const timeout = setTimeout(
    () => controller.abort(),
    isMutation ? siteMutationTimeoutMs : siteReadTimeoutMs,
  );
  try {
    const response = await fetch(input, { ...init, signal });
    // Keep the deadline active until the whole body arrives, not just headers.
    const text = await response.text();
    if (response.status >= 500) return failureResponse(isMutation, response.status);
    if (response.status === 204 && isMutation) return Response.json({ ok: true });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      if (!response.ok && text.trim() && !/^\s*</.test(text)) {
        return Response.json({ error: text.trim() }, { status: response.status });
      }
      return failureResponse(isMutation, response.ok ? 502 : response.status);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return failureResponse(isMutation, response.ok ? 502 : response.status);
    }
    return Response.json(body, {
      status: response.status,
      headers: response.headers.has("Retry-After")
        ? { "Retry-After": response.headers.get("Retry-After")! }
        : undefined,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    return failureResponse(isMutation);
  } finally {
    clearTimeout(timeout);
  }
}

/** JSON requests only. Mutations are never replayed after an uncertain response. */
export async function fetchSiteRequest(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  const canShare = isMutation && !init.signal && !(input instanceof Request)
    && (init.body == null || typeof init.body === "string" || init.body instanceof FormData);
  if (!canShare) return requestJson(input, init, isMutation);

  const headers = Array.from(new Headers(init.headers).entries());
  const key = JSON.stringify([String(input), method, requestBodyKey(init.body), headers]);
  let pending = pendingMutations.get(key);
  if (!pending) {
    pending = requestJson(input, init, true);
    pendingMutations.set(key, pending);
  }
  try {
    return (await pending).clone();
  } finally {
    if (pendingMutations.get(key) === pending) pendingMutations.delete(key);
  }
}
