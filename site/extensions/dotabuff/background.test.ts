import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

type Listener = (message: unknown, sender: unknown, respond: (value: unknown) => void) => boolean;
let external: Listener;
let internal: Listener;
let removed: (tabId: number) => void;
const storage: Record<string, unknown> = {};
const update = vi.fn();
const owner = { url: "https://lsesports.ru/tournaments/league-season-9", frameId: 0, tab: { id: 10 } };
const id = "11111111-1111-1111-1111-111111111111";
const source = (page = 1) => ({ url: `https://www.dotabuff.com/players/100/matches?date=month&lobby_type=ranked_matchmaking&page=${page}`, frameId: 0, tab: { id: 20 } });
const send = (listener: Listener, message: unknown, sender: unknown = owner) => new Promise<Record<string, unknown>>((resolve) => listener(message, sender, (value) => resolve(value as Record<string, unknown>)));

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  delete storage.activeJob;
  update.mockResolvedValue({});
  vi.stubGlobal("chrome", {
    storage: { session: { get: vi.fn(async () => storage), set: vi.fn(async (value) => Object.assign(storage, value)) } },
    tabs: { create: vi.fn(async () => ({ id: 20 })), update, onRemoved: { addListener: (listener: typeof removed) => { removed = listener; } } },
    runtime: { getManifest: () => ({ version: "1.0.0" }),
      onMessageExternal: { addListener: (listener: Listener) => { external = listener; } },
      onMessage: { addListener: (listener: Listener) => { internal = listener; } } },
  });
  await import("./background");
});
afterEach(() => vi.unstubAllGlobals());

describe("Dotabuff extension job isolation", () => {
  it("rejects unrelated origins and nested frames", async () => {
    expect(await send(external, { type: "ping" }, { ...owner, url: "https://attacker.test" })).toHaveProperty("error");
    expect(await send(external, { type: "ping" }, { ...owner, frameId: 1 })).toHaveProperty("error");
  });
  it("opens only a constructed Dotabuff URL and waits without navigating on a challenge", async () => {
    expect(await send(external, { type: "start", id, dotaId: "100" })).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(20, { url: "https://www.dotabuff.com/players/100/matches?lobby_type=ranked_matchmaking&date=month&page=1" });
    await send(internal, { type: "waiting", id, page: 1 }, source());
    expect((await send(external, { type: "status", id })).state).toBe("waiting");
    expect(update).toHaveBeenCalledTimes(1);
  });
  it("accepts pages only from the assigned tab and returns the complete result to its owner", async () => {
    await send(external, { type: "start", id, dotaId: "100" });
    expect(await send(internal, { type: "getJob" }, { ...source(), tab: { id: 30 } })).toBeNull();
    expect(await send(external, { type: "status", id }, { ...owner, tab: { id: 11 } })).toHaveProperty("error");
    const match = { matchId: "5", startedAt: new Date().toISOString(), won: true, role: 5 };
    await send(internal, { type: "page", id, page: 1, matches: [match], hasNextPage: true }, source());
    expect(update).toHaveBeenLastCalledWith(20, { url: expect.stringContaining("page=2") });
    await send(internal, { type: "page", id, page: 2, matches: [{ ...match, matchId: "6" }], hasNextPage: false }, source(2));
    expect((await send(external, { type: "status", id })).state).toBe("complete");
    expect(update).toHaveBeenLastCalledWith(10, { active: true });
  });
  it("rejects competing requests, and cancels when either task tab is closed", async () => {
    await send(external, { type: "start", id, dotaId: "100" });
    expect(await send(external, { type: "start", id, dotaId: "200" })).toHaveProperty("error");
    removed(20);
    expect((await send(external, { type: "status", id })).state).toBe("error");
  });
  it("ignores late pages after cancellation", async () => {
    await send(external, { type: "start", id, dotaId: "100" });
    await send(external, { type: "cancel", id });
    expect(await send(internal, { type: "page", id, page: 1, matches: [], hasNextPage: false }, source())).toBeNull();
    expect((await send(external, { type: "status", id })).state).toBe("error");
  });
});
