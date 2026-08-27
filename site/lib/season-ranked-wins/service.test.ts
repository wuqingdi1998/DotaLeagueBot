import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./stratz", () => ({ fetchStratzRankedMatches: vi.fn() }));

import { calculateSeasonRankedWins, SeasonRankedWinsError } from "./service";
import { fetchStratzRankedMatches } from "./stratz";

const now = new Date("2026-08-27T12:00:00.000Z");

describe("season ranked wins service", () => {
  beforeEach(() => vi.resetAllMocks());

  it("calculates wins using only Stratz matches", async () => {
    vi.mocked(fetchStratzRankedMatches).mockResolvedValue([
      {
        matchId: "100",
        role: 3,
        startedAt: new Date("2026-08-20T12:00:00.000Z"),
        won: true,
      },
    ]);

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).resolves.toMatchObject({ primaryWins: 1, secondaryWins: 0 });
    expect(fetchStratzRankedMatches).toHaveBeenCalledOnce();
  });

  it("does not save a Stratz result with a missing role", async () => {
    vi.mocked(fetchStratzRankedMatches).mockResolvedValue([
      {
        matchId: "100",
        role: null,
        startedAt: new Date("2026-08-20T12:00:00.000Z"),
        won: true,
      },
    ]);

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).rejects.toBeInstanceOf(SeasonRankedWinsError);
  });

  it("returns a controlled error when Stratz is unavailable", async () => {
    vi.mocked(fetchStratzRankedMatches).mockRejectedValue(new Error("timeout"));

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).rejects.toBeInstanceOf(SeasonRankedWinsError);
  });
});
