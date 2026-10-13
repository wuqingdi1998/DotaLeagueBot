export const siteReadTimeoutMs = 45_000;
export const siteMutationTimeoutMs = 90_000;
export const uncertainActionMessage =
  "Не удалось получить подтверждение от сервера. Действие могло сохраниться. Обновите данные перед повторным нажатием";
export const unavailableDataMessage =
  "Сайт временно недоступен или обновляется. Подождите немного и обновите данные";

const pendingMutations = new Map<string, Promise<Response>>();
const uploadIds = new WeakMap<Blob, number>();
let nextUploadId = 0;

// Safari on iOS 16 supports Response construction, but not static Response.json.
function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function requestBodyKey(body: BodyInit | null | undefined): unknown {
  if (!(body instanceof FormData)) return body ?? null;
  return Array.from(body.entries(), ([name, value]) => {
    if (typeof value === "string") return [name, value];
    if (!uploadIds.has(value)) uploadIds.set(value, ++nextUploadId);
    return [name, { uploadId: uploadIds.get(value) }];
  });
}

function failureResponse(isMutation: boolean, status = 503, reason?: string): Response {
  return jsonResponse({
    error: [reason, isMutation ? uncertainActionMessage : unavailableDataMessage].filter(Boolean).join(". "),
    outcomeUnknown: isMutation,
  }, { status });
}

async function requestJson(
  input: RequestInfo | URL,
  init: RequestInit,
  isMutation: boolean,
): Promise<Response> {
  const controller = new AbortController();
  const cancelFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) cancelFromCaller();
  else init.signal?.addEventListener("abort", cancelFromCaller, { once: true });
  const timeout = setTimeout(
    () => controller.abort(),
    isMutation ? siteMutationTimeoutMs : siteReadTimeoutMs,
  );
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // Keep the deadline active until the whole body arrives, not just headers.
    const text = await response.text();
    if (response.status >= 500) {
      // Only this known domain failure is safe to display instead of an uncertain write.
      // Unexpected server responses can contain internal diagnostics or saved actions.
      try {
        const body = JSON.parse(text);
        if (response.status === 503 && body?.code === "OPEN_DOTA_UNAVAILABLE"
          && typeof body.error === "string" && body.error.trim()) {
          return jsonResponse({ error: body.error, code: body.code }, { status: response.status });
        }
      } catch { /* Fall through to a safe status-based explanation. */ }
      return failureResponse(isMutation, response.status, `Сервер сайта вернул ошибку ${response.status}`);
    }
    if (response.status === 204 && isMutation) return jsonResponse({ ok: true });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      if (!response.ok && text.trim() && !/^\s*</.test(text)) {
        return jsonResponse({ error: text.trim() }, { status: response.status });
      }
      return failureResponse(isMutation, response.ok ? 502 : response.status, "Сайт вернул некорректный ответ");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return failureResponse(isMutation, response.ok ? 502 : response.status, "Сайт вернул некорректный ответ");
    }
    return jsonResponse(body, {
      status: response.status,
      headers: response.headers.has("Retry-After")
        ? { "Retry-After": response.headers.get("Retry-After")! }
        : undefined,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    return failureResponse(isMutation, 503, controller.signal.aborted
      ? `Сервер сайта не ответил за ${(isMutation ? siteMutationTimeoutMs : siteReadTimeoutMs) / 1_000} секунд`
      : "Не удалось связаться с сайтом: соединение прервано или недоступно");
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", cancelFromCaller);
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
