import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./opendota", () => ({
  fetchOpenDotaMatchPosition: vi.fn(),
  fetchOpenDotaRankedMatches: vi.fn(),
}));
vi.mock("./dotabuff", () => ({ fetchDotaBuffRankedMatches: vi.fn() }));
vi.mock("./stratz", () => ({ fetchStratzRankedMatches: vi.fn() }));

import { fetchDotaBuffRankedMatches } from "./dotabuff";
import { fetchOpenDotaRankedMatches } from "./opendota";
import { calculateSeasonRankedWins, SeasonRankedWinsError } from "./service";
import { fetchStratzRankedMatches } from "./stratz";

const now = new Date("2026-08-27T12:00:00.000Z");
const unknownOpenDotaWin = {
  matchId: "100",
  role: null,
  roleConfidence: 1,
  source: "opendota" as const,
  startedAt: new Date("2026-08-20T12:00:00.000Z"),
  won: true,
};

describe("season ranked wins service", () => {
  beforeEach(() => vi.resetAllMocks());

  it("refuses to replace a snapshot when a recent win still has no role", async () => {
    vi.mocked(fetchOpenDotaRankedMatches).mockResolvedValue([unknownOpenDotaWin]);
    vi.mocked(fetchDotaBuffRankedMatches).mockRejectedValue(new Error("blocked"));
    vi.mocked(fetchStratzRankedMatches).mockRejectedValue(new Error("timeout"));

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).rejects.toBeInstanceOf(SeasonRankedWinsError);
  });

  it("uses the Stratz role to complete the same OpenDota win", async () => {
    vi.mocked(fetchOpenDotaRankedMatches).mockResolvedValue([unknownOpenDotaWin]);
    vi.mocked(fetchDotaBuffRankedMatches).mockRejectedValue(new Error("blocked"));
    vi.mocked(fetchStratzRankedMatches).mockResolvedValue([
      { ...unknownOpenDotaWin, role: 3, roleConfidence: 3, source: "stratz" },
    ]);

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).resolves.toMatchObject({ primaryWins: 1, secondaryWins: 0 });
  });
});
