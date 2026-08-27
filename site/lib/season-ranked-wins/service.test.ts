import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./stratz", () => ({ fetchStratzRankedMatches: vi.fn() }));
vi.mock("./dotabuff", () => ({ fetchDotaBuffRolesForMatches: vi.fn() }));

import { calculateSeasonRankedWins, SeasonRankedWinsError } from "./service";
import { fetchDotaBuffRolesForMatches } from "./dotabuff";
import { fetchStratzRankedMatches } from "./stratz";

const now = new Date("2026-08-27T12:00:00.000Z");

describe("season ranked wins service", () => {
  beforeEach(() => vi.resetAllMocks());

  it("calculates wins from Stratz without calling DotaBuff when every role is known", async () => {
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
    expect(fetchDotaBuffRolesForMatches).not.toHaveBeenCalled();
  });

  it("uses DotaBuff only for a winning Stratz match with a missing role", async () => {
    vi.mocked(fetchStratzRankedMatches).mockResolvedValue([
      {
        matchId: "100",
        role: null,
        startedAt: new Date("2026-08-20T12:00:00.000Z"),
        won: true,
      },
    ]);
    vi.mocked(fetchDotaBuffRolesForMatches).mockResolvedValue(
      new Map([["100", 3]]),
    );

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).resolves.toMatchObject({ primaryWins: 1, secondaryWins: 0 });
    expect(fetchDotaBuffRolesForMatches).toHaveBeenCalledWith({
      dotaId: "20",
      matchIds: ["100"],
    });
  });

  it("skips only unresolved matches and still saves known Stratz wins", async () => {
    vi.mocked(fetchStratzRankedMatches).mockResolvedValue([
      {
        matchId: "100",
        role: 3,
        startedAt: new Date("2026-08-20T12:00:00.000Z"),
        won: true,
      },
      {
        matchId: "101",
        role: null,
        startedAt: new Date("2026-08-21T12:00:00.000Z"),
        won: true,
      },
    ]);
    vi.mocked(fetchDotaBuffRolesForMatches).mockRejectedValue(
      new Error("anti-bot challenge"),
    );

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).resolves.toMatchObject({ primaryWins: 1, secondaryWins: 0 });
  });

  it("saves zero when DotaBuff cannot find the only Stratz win without a role", async () => {
    vi.mocked(fetchStratzRankedMatches).mockResolvedValue([
      {
        matchId: "101",
        role: null,
        startedAt: new Date("2026-08-21T12:00:00.000Z"),
        won: true,
      },
    ]);
    vi.mocked(fetchDotaBuffRolesForMatches).mockResolvedValue(new Map());

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).resolves.toMatchObject({ primaryWins: 0, secondaryWins: 0 });
  });

  it("returns a controlled error when Stratz is unavailable", async () => {
    vi.mocked(fetchStratzRankedMatches).mockRejectedValue(new Error("timeout"));

    await expect(
      calculateSeasonRankedWins({ dotaId: "20", now, positions: "3/4" }),
    ).rejects.toBeInstanceOf(SeasonRankedWinsError);
  });
});
