import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin, responseFromAuthError: (error: unknown) => {
  if (error instanceof Response) return error;
  throw error;
} }));
vi.mock("@/lib/season-ranked-wins/organizer-service", () => ({ updateOrganizerRankedWins: mocks.update }));
vi.mock("@/lib/season-ranked-wins/organizer-model", () => import("../../../../../lib/season-ranked-wins/organizer-model"));
vi.mock("@/lib/season-ranked-wins/service", () => import("../../../../../lib/season-ranked-wins/service"));
import { POST } from "./route";
const body = { roundId: 1, playerId: "100", positions: "1/5", source: "manual", primaryWins: 12, secondaryWins: 0 };
function request(value: unknown) { return new Request("https://example.test/api/admin/season/ranked-wins", { method: "POST", body: JSON.stringify(value) }); }
beforeEach(() => { vi.resetAllMocks(); mocks.requireAdmin.mockResolvedValue({ discordId: "999" }); mocks.update.mockResolvedValue({ ok: true }); });
describe("organizer ranked win access", () => {
  it.each([401, 403])("rejects unauthorized users with %s", async (status) => {
    mocks.requireAdmin.mockRejectedValue(new Response("Нет доступа", { status }));
    expect((await POST(request(body))).status).toBe(status);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("validates both counts before calling the service", async () => {
    expect((await POST(request({ ...body, secondaryWins: -1 }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("records the authenticated organizer", async () => {
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(body, "999");
  });
  it("rejects malformed JSON", async () => {
    expect((await POST(new Request("https://example.test", { method: "POST", body: "{" }))).status).toBe(400);
  });
});
