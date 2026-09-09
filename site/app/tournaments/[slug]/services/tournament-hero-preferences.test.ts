import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  one: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  one: mocks.one,
  query: mocks.query,
}));

import {
  loadTournamentHeroPreference,
  saveTournamentHeroPreference,
} from "./tournament-hero-preferences";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("tournament hero preference storage", () => {
  it("opens the hero by default for guests and participants without a row", async () => {
    expect(await loadTournamentHeroPreference(null, 7)).toEqual({
      isCollapsed: false,
    });
    expect(mocks.one).not.toHaveBeenCalled();

    mocks.one.mockResolvedValue(null);
    expect(await loadTournamentHeroPreference("123", 7)).toEqual({
      isCollapsed: false,
    });
  });

  it("loads the value for the requested participant and tournament", async () => {
    mocks.one.mockResolvedValue({ isCollapsed: true });

    expect(await loadTournamentHeroPreference("123", 7)).toEqual({
      isCollapsed: true,
    });
    expect(mocks.one).toHaveBeenCalledWith(expect.any(String), [7, "123"]);
  });

  it("updates or creates one preference per participant and tournament", async () => {
    await saveTournamentHeroPreference("123", 7, true);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "ON CONFLICT (tournament_id, player_id) DO UPDATE",
      ),
      [7, "123", true],
    );
  });
});
