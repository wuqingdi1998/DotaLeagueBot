import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchSiteRequest,
  siteMutationTimeoutMs,
  uncertainActionMessage,
  unavailableDataMessage,
} from "./site-request";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("iOS 16 request compatibility", () => {
  beforeEach(() => {
    class LegacyResponse extends Response {}
    class LegacyAbortSignal extends AbortSignal {}
    Object.defineProperty(LegacyResponse, "json", { value: undefined });
    Object.defineProperty(LegacyAbortSignal, "any", { value: undefined });
    vi.stubGlobal("Response", LegacyResponse);
    vi.stubGlobal("AbortSignal", LegacyAbortSignal);
  });

  it("loads home page data without the newer static browser functions", async () => {
    const body = { tournaments: [{ id: 7, title: "Турнир" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    const response = await fetchSiteRequest("/api/tournaments", { signal: new AbortController().signal });
    expect(response.ok).toBe(true);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual(body);
  });

  it.each([
    [204, null, { ok: true }],
    [429, '{"error":"Подождите"}', { error: "Подождите" }],
    [400, "Проверьте данные", { error: "Проверьте данные" }],
    [503, '{"code":"OPEN_DOTA_UNAVAILABLE","error":"Повторите позже"}',
      { code: "OPEN_DOTA_UNAVAILABLE", error: "Повторите позже" }],
  ])("preserves action results and retry headers for status %s", async (status, text, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(text, {
      status, headers: { "Retry-After": "12" },
    })));
    const response = await fetchSiteRequest("/api/example", { method: "POST" });
    expect(response.status).toBe(status === 204 ? 200 : status);
    expect(await response.json()).toEqual(body);
    if (status === 429) expect(response.headers.get("Retry-After")).toBe("12");
  });

  it.each(["offline", "server", "invalid"])("explains a %s failure without a browser exception", async (failure) => {
    const fetchMock = failure === "offline"
      ? vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
      : vi.fn().mockResolvedValue(new Response(failure === "server" ? "" : "<html>error</html>", {
        status: failure === "server" ? 502 : 200,
      }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await fetchSiteRequest("/api/tournaments");
    expect(response.ok).toBe(false);
    expect(await response.json()).toEqual({
      error: expect.stringContaining(unavailableDataMessage), outcomeUnknown: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards caller cancellation and releases its listener", async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason));
    })));
    const pending = fetchSiteRequest("/api/tournaments", { signal: controller.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejection;
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("keeps the timeout when a caller signal is supplied", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason));
    })));
    const pending = fetchSiteRequest("/api/example", { method: "POST", signal: controller.signal });
    await vi.advanceTimersByTimeAsync(siteMutationTimeoutMs);
    expect((await (await pending).json()).outcomeUnknown).toBe(true);
    expect(controller.signal.aborted).toBe(false);
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});

describe("site action transport", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("does not replay an uncertain %s", async (method) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await fetchSiteRequest("/api/example", { method });
    expect(response.ok).toBe(false);
    expect(await response.json()).toEqual({ error: `Сервер сайта вернул ошибку 502. ${uncertainActionMessage}`, outcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["", '{"ok":', "<html>gateway error</html>", "null", "[]"])("does not claim success for a damaged 200 body: %s", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    const response = await fetchSiteRequest("/api/example", { method: "POST" });
    expect(response.ok).toBe(false);
    expect((await response.json()).outcomeUnknown).toBe(true);
  });

  it("accepts an explicit no-content success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    expect(await (await fetchSiteRequest("/api/example", { method: "DELETE" })).json()).toEqual({ ok: true });
  });

  it("preserves a known OpenDota failure and its specific explanation", async () => {
    const body = { code: "OPEN_DOTA_UNAVAILABLE", error: "Не удалось получить данные матчей из OpenDota. Попробуйте повторить проверку позже." };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await fetchSiteRequest("/api/compendium/rune-challenge/check", { method: "POST" });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([500, 502, 503, 504])("explains status %s without exposing internal diagnostics", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { error: "secret database diagnostics", code: "INTERNAL_ERROR" }, { status },
    )));
    const result = await (await fetchSiteRequest("/api/example", { method: "POST" })).json();
    expect(result).toEqual({ error: `Сервер сайта вернул ошибку ${status}. ${uncertainActionMessage}`, outcomeUnknown: true });
  });

  it("explains a broken connection and preserves uncertainty without replaying a write", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await (await fetchSiteRequest("/api/example", { method: "POST" })).json();
    expect(result.error).toContain("соединение прервано или недоступно");
    expect(result.outcomeUnknown).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps validation errors and retry guidance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { error: "Слишком много запросов" }, { status: 429, headers: { "Retry-After": "12" } },
    )));
    const response = await fetchSiteRequest("/api/example", { method: "POST" });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    expect(await response.json()).toEqual({ error: "Слишком много запросов" });
  });

  it("shares simultaneous identical writes without sharing consumed response bodies", async () => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const init = { method: "POST", body: '{"action":"create"}' };
    const first = fetchSiteRequest("/api/example", init);
    const second = fetchSiteRequest("/api/example", init);
    finish(Response.json({ id: 7 }));
    expect(await (await first).json()).toEqual({ id: 7 });
    expect(await (await second).json()).toEqual({ id: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not merge different actions", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all(["first", "second"].map((body) => fetchSiteRequest("/api/example", { method: "POST", body })));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares duplicate form submissions but keeps different uploaded files separate", async () => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["image"], "emblem.png");
    const form = () => {
      const body = new FormData();
      body.set("team", "team-one");
      body.set("emblem", file);
      return body;
    };
    const first = fetchSiteRequest("/api/example", { method: "POST", body: form() });
    const second = fetchSiteRequest("/api/example", { method: "POST", body: form() });
    finish(Response.json({ ok: true }));
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockImplementation(async () => Response.json({ ok: true }));
    const changed = form();
    changed.set("emblem", new File(["different"], "emblem.png"));
    await Promise.all([
      fetchSiteRequest("/api/example", { method: "POST", body: form() }),
      fetchSiteRequest("/api/example", { method: "POST", body: changed }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps a timeout active while the response body is stalled", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => ({
      text: () => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("Timeout", "AbortError")));
      }),
    })));
    const pending = fetchSiteRequest("/api/example", { method: "POST" });
    await vi.advanceTimersByTimeAsync(siteMutationTimeoutMs);
    expect(await (await pending).json()).toEqual({
      error: `Сервер сайта не ответил за 90 секунд. ${uncertainActionMessage}`, outcomeUnknown: true,
    });
  });

  it("handles offline reads without displaying a browser exception", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await (await fetchSiteRequest("/api/example")).json()).toEqual({
      error: `Не удалось связаться с сайтом: соединение прервано или недоступно. ${unavailableDataMessage}`, outcomeUnknown: false,
    });
  });

  it("preserves explicit cancellation by the caller", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(controller.signal.reason));
    await expect(fetchSiteRequest("/api/example", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });
});
