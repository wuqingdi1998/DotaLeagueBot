import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), complete: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin,
  responseFromAuthError: (error: unknown) => { if (error === "unauthorized") return Response.json({}, { status: 403 }); throw error; } }));
vi.mock("./historical-completion-service", () => ({ completeHistoricalChallenge: mocks.complete }));
vi.mock("./challenge-history-repository", () => ({ loadHistoricalChallenges: mocks.load }));
import { POST } from "../../api/admin/compendium-base/participants/[playerId]/complete/route";
import { GET } from "../../api/admin/compendium-base/participants/[playerId]/challenges/route";
const context = { params: Promise.resolve({ playerId: "100" }) };
const request = (body: unknown) => new Request("https://example.test/api/admin/complete", {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ actorDiscordId: null });
  mocks.complete.mockResolvedValue({ rewardStars: 2, wasCreated: true });
  mocks.load.mockResolvedValue({ dateKey: "2026-10-10", challenges: [] });
});
it("passes the chosen day, match, hero and organizer identity to the dated completion", async () => {
  const result = await POST(request({ kind: "daily", questId: "200", dateKey: "2026-10-10",
    matchIds: ["9037161572"], heroId: 7 }), context);
  expect(result.status).toBe(200);
  expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ playerId: "100",
    questId: "200", dateKey: "2026-10-10", matchIds: ["9037161572"], heroId: 7, administratorId: null }));
});
it("protects both the archive and manual awards from non-organizers", async () => {
  mocks.requireAdmin.mockRejectedValue("unauthorized");
  expect((await POST(request({ kind: "rune", dateKey: "2026-10-10", matchIds: ["1"] }), context)).status).toBe(403);
  expect((await GET(new Request("https://example.test?date=2026-10-10"), context)).status).toBe(403);
  expect(mocks.complete).not.toHaveBeenCalled();
  expect(mocks.load).not.toHaveBeenCalled();
});
it("rejects invalid match data and reads exactly the selected date", async () => {
  expect((await POST(request({ kind: "rune", dateKey: "2026-10-10", matchIds: [null] }), context)).status).toBe(400);
  const result = await GET(new Request("https://example.test?date=2026-10-09"), context);
  expect(result.status).toBe(200);
  expect(mocks.load).toHaveBeenCalledWith("100", "2026-10-09");
  expect(result.headers.get("cache-control")).toBe("no-store");
});
