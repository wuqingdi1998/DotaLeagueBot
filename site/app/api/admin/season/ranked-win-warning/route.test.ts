import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), queue: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.requireAdmin,
  responseFromAuthError: (error: unknown) => {
    if (error instanceof Response) return error;
    throw error;
  },
}));
vi.mock("@/lib/season-ranked-wins/warning-service", () => ({
  queueOrganizerRankedWinWarning: mocks.queue,
}));

import { POST } from "./route";

const body = { roundId: 3, playerId: "100" };
function request(value: unknown) {
  return new Request("https://example.test/api/admin/season/ranked-win-warning", {
    method: "POST",
    body: JSON.stringify(value),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ discordId: "999" });
  mocks.queue.mockResolvedValue({ ok: true, alreadySent: false });
});

describe("organizer ranked win warning access", () => {
  it.each([401, 403])("rejects unauthorized users with %s", async (status) => {
    mocks.requireAdmin.mockRejectedValue(new Response("Нет доступа", { status }));
    expect((await POST(request(body))).status).toBe(status);
    expect(mocks.queue).not.toHaveBeenCalled();
  });

  it("validates the player and round before queuing", async () => {
    expect((await POST(request({ roundId: 0, playerId: "100" }))).status).toBe(400);
    expect(mocks.queue).not.toHaveBeenCalled();
  });

  it("records the authenticated organizer", async () => {
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.queue).toHaveBeenCalledWith(body, "999");
  });
});
