import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(), after: vi.fn(), selectDraftHero: vi.fn(),
  loadFearlessDraftSnapshot: vi.fn(), processBot3Captains: vi.fn(),
  publishLiveUpdate: vi.fn(), advanceBotDraft: vi.fn(),
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/auth", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/lib/player-participation", () => ({ requirePlayerParticipation: vi.fn() }));
vi.mock("@/app/fearless-draft/server/series-service", () => ({ ...mocks,
  makeDraftChoice: vi.fn(), highlightDraftHero: vi.fn(), dismissCompletedSeries: vi.fn() }));
vi.mock("@/app/fearless-draft/server/snapshot-service", () => mocks);
vi.mock("@/app/fearless-draft/server/bot3-captain-service", () => mocks);
vi.mock("@/app/fearless-draft/server/bot-service", () => ({ ...mocks, startBotDraft: vi.fn() }));
vi.mock("@/lib/live-update-events", () => ({ ...mocks,
  fearlessDraftChannel: (id?: number) => `draft:${id}`, seasonLobbyChannel: (id: number) => `room:${id}` }));
import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({ discordId: "10001" });
  mocks.selectDraftHero.mockResolvedValue({ seriesId: 10, map: { id: 20, version: 3 } });
  mocks.processBot3Captains.mockResolvedValue(false);
});

function request(seasonMatchId: number | undefined = 100, target: object = { seriesId: 10, mapId: 20 }) {
  return new Request(`http://localhost/api/fearless-draft${seasonMatchId ? `?seasonMatchId=${seasonMatchId}` : ""}`, {
    method: "POST", body: JSON.stringify({ action: "SELECT_HERO", heroId: 1, expectedVersion: 2, ...target }),
  });
}

describe("fast scoped hero action", () => {
  it("returns the committed receipt without awaiting viewer rebuilds or bot work", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, heroAction: { seriesId: 10, map: { id: 20, version: 3 } } });
    expect(response.headers.get("Server-Timing")).toMatch(/^draft;dur=\d+$/);
    expect(mocks.selectDraftHero).toHaveBeenCalledWith("10001", 1, 2, { seriesId: 10, mapId: 20, seasonMatchId: 100 });
    expect(mocks.loadFearlessDraftSnapshot).not.toHaveBeenCalled();
    expect(mocks.processBot3Captains).not.toHaveBeenCalled();
    expect(mocks.publishLiveUpdate).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.publishLiveUpdate).toHaveBeenCalledWith("draft:100");
    expect(mocks.advanceBotDraft).not.toHaveBeenCalled();
  });

  it("rejects a command without its series and map instead of selecting another open game", async () => {
    expect((await POST(request(100, {}))).status).toBe(400);
    expect(mocks.selectDraftHero).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("limits bot follow-up to the exact standalone series after the acknowledgement", async () => {
    expect((await POST(request(undefined))).status).toBe(200);
    await mocks.after.mock.calls[0][0]();
    expect(mocks.advanceBotDraft).not.toHaveBeenCalled();
    expect((await POST(request(0))).status).toBe(200);
    await mocks.after.mock.calls[1][0]();
    expect(mocks.advanceBotDraft).toHaveBeenCalledWith("10001", 10);
  });
});
