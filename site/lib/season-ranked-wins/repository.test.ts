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
    mocks.one.mockResolvedValue({
      player_id: "100",
      dota_id: "301109815",
      positions: "1/3",
    });
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
