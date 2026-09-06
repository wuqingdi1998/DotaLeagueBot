import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calculateSeasonRankedWins: vi.fn(),
  one: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ one: mocks.one, query: mocks.query }));
vi.mock("./service", () => ({
  calculateSeasonRankedWins: mocks.calculateSeasonRankedWins,
  SeasonRankedWinsError: class SeasonRankedWinsError extends Error {},
}));

import { refreshPlayerRankedWins } from "./repository";

describe("season ranked wins repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.one.mockResolvedValueOnce(null).mockResolvedValue({
      player_id: "100",
      dota_id: "301109815",
      positions: "1/3",
    });
  });

  it("preserves manually entered wins without contacting Stratz", async () => {
    mocks.one.mockReset().mockResolvedValue({
      primary_role: 1, secondary_role: 3, primary_wins: 12, secondary_wins: 0,
      checked_at: new Date("2026-09-06T10:00:00Z"),
    });
    await expect(refreshPlayerRankedWins("100")).resolves.toMatchObject({ primaryWins: 12, secondaryWins: 0 });
    expect(mocks.calculateSeasonRankedWins).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("preserves Dotabuff wins without contacting Stratz", async () => {
    mocks.one.mockReset().mockResolvedValue({
      primary_role: 1, secondary_role: 3, primary_wins: 9, secondary_wins: 4,
      checked_at: new Date("2026-09-06T10:00:00Z"),
    });
    await expect(refreshPlayerRankedWins("100")).resolves.toMatchObject({ primaryWins: 9, secondaryWins: 4 });
    expect(mocks.calculateSeasonRankedWins).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("does not overwrite the previous snapshot when Stratz fails", async () => {
    mocks.calculateSeasonRankedWins.mockRejectedValue(
      new Error("Stratz unavailable"),
    );

    await expect(refreshPlayerRankedWins("100")).rejects.toThrow(
      "Stratz unavailable",
    );
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
