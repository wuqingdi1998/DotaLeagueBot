import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  savePreference: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireSession: mocks.requireSession,
  responseFromAuthError: (error: unknown) => {
    if (error instanceof Response) return error;
    throw error;
  },
}));
vi.mock(
  "@/app/tournaments/[slug]/services/tournament-hero-preferences",
  () => ({
    saveTournamentHeroPreference: mocks.savePreference,
  }),
);

import { PATCH } from "./route";

function request(value: unknown) {
  return new Request("https://example.test/api/tournament-hero-preferences", {
    method: "PATCH",
    body: JSON.stringify(value),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireSession.mockResolvedValue({ discordId: "123" });
});

describe("tournament hero preferences", () => {
  it("requires a logged-in participant", async () => {
    mocks.requireSession.mockRejectedValue(
      new Response("Требуется вход", { status: 401 }),
    );

    expect(
      (await PATCH(request({ tournamentId: 7, isCollapsed: true }))).status,
    ).toBe(401);
    expect(mocks.savePreference).not.toHaveBeenCalled();
  });

  it("saves collapsed and expanded values", async () => {
    const collapsed = await PATCH(
      request({ tournamentId: 7, isCollapsed: true }),
    );
    const expanded = await PATCH(
      request({ tournamentId: 7, isCollapsed: false }),
    );

    expect(collapsed.status).toBe(200);
    expect(expanded.status).toBe(200);
    expect(mocks.savePreference).toHaveBeenNthCalledWith(1, "123", 7, true);
    expect(mocks.savePreference).toHaveBeenNthCalledWith(2, "123", 7, false);
  });

  it("rejects invalid tournament identifiers and values", async () => {
    expect(
      (await PATCH(request({ tournamentId: 0, isCollapsed: true }))).status,
    ).toBe(400);
    expect(
      (await PATCH(request({ tournamentId: 7, isCollapsed: "true" }))).status,
    ).toBe(400);
    expect(mocks.savePreference).not.toHaveBeenCalled();
  });
});
