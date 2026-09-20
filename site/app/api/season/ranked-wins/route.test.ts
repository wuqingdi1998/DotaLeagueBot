import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fresh: vi.fn(),
  one: vi.fn(),
  refresh: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireSession: mocks.requireSession,
  responseFromAuthError: (error: unknown) => {
    if (error instanceof Response) return error;
    throw error;
  },
}));
vi.mock("@/lib/db", () => ({ one: mocks.one }));
vi.mock("@/lib/season-ranked-wins/repository", () => ({
  freshPlayerRankedWins: mocks.fresh,
  refreshPlayerRankedWins: mocks.refresh,
}));
vi.mock("@/lib/season-ranked-wins/service", () => ({
  SeasonRankedWinsError: class SeasonRankedWinsError extends Error {},
}));

import { POST } from "./route";

const snapshot = {
  primaryRole: 1,
  secondaryRole: 5,
  primaryWins: 10,
  secondaryWins: 4,
  checkedAt: "2026-09-20T10:00:00.000Z",
  availableUntil: "2026-09-20T10:05:00.000Z",
};

function request(body: unknown) {
  return new Request("https://example.test/api/season/ranked-wins", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireSession.mockResolvedValue({ discordId: "100" });
  mocks.one.mockResolvedValue({ id: 7 });
  mocks.fresh.mockResolvedValue(snapshot);
  mocks.refresh.mockResolvedValue(snapshot);
});

describe("player ranked win checks", () => {
  it("uses the recent result for an ordinary request", async () => {
    expect((await POST(request({ roundId: 7 }))).status).toBe(200);
    expect(mocks.fresh).toHaveBeenCalledWith(7, "100");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("skips the recent result for every forced Stratz attempt", async () => {
    expect((await POST(request({ roundId: 7, forceRefresh: true }))).status)
      .toBe(200);
    expect(mocks.fresh).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledWith(7, "100");
  });
});
