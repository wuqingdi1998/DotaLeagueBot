import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  savePreferences: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireSession: mocks.requireSession,
  responseFromAuthError: (error: unknown) => {
    if (error instanceof Response) return error;
    throw error;
  },
}));
vi.mock("@/app/tournaments/services/tournament-directory-preferences", () => ({
  saveTournamentDirectoryPreferences: mocks.savePreferences,
}));

import { PATCH } from "./route";

function request(value: unknown) {
  return new Request(
    "https://example.test/api/tournament-directory-preferences",
    {
      method: "PATCH",
      body: JSON.stringify(value),
    },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireSession.mockResolvedValue({ discordId: "123" });
});

describe("tournament directory preferences", () => {
  it("requires a logged-in participant", async () => {
    mocks.requireSession.mockRejectedValue(
      new Response("Требуется вход", { status: 401 }),
    );

    expect((await PATCH(request({ shouldHideArchivedTournaments: true }))).status)
      .toBe(401);
    expect(mocks.savePreferences).not.toHaveBeenCalled();
  });

  it("saves both the selected and cleared checkbox values", async () => {
    const selected = await PATCH(
      request({ shouldHideArchivedTournaments: true }),
    );
    const cleared = await PATCH(
      request({ shouldHideArchivedTournaments: false }),
    );

    expect(selected.status).toBe(200);
    expect(cleared.status).toBe(200);
    expect(mocks.savePreferences).toHaveBeenNthCalledWith(1, "123", true);
    expect(mocks.savePreferences).toHaveBeenNthCalledWith(2, "123", false);
  });

  it("rejects missing, non-boolean, and malformed values", async () => {
    expect((await PATCH(request({}))).status).toBe(400);
    expect(
      (await PATCH(request({ shouldHideArchivedTournaments: "true" }))).status,
    ).toBe(400);
    expect(
      (
        await PATCH(
          new Request("https://example.test", {
            method: "PATCH",
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.savePreferences).not.toHaveBeenCalled();
  });
});
