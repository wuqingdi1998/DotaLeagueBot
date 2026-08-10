import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchRecentPlayerMatches: vi.fn(),
  loadCandidates: vi.fn(),
  loadRewardedPlayerIds: vi.fn(),
}));

vi.mock("./opendota", () => ({
  fetchRecentPlayerMatches: mocks.fetchRecentPlayerMatches,
}));

vi.mock("./unclaimed-star-race-repository", () => ({
  loadUnrewardedStarRaceCandidates: mocks.loadCandidates,
  loadRewardedStarRacePlayerIds: mocks.loadRewardedPlayerIds,
}));

import { findUnclaimedStarRaceWins } from "./unclaimed-star-race";

const mondayNow = new Date("2026-08-10T12:00:00.000Z");

function match(input: {
  matchId: number;
  heroId: number;
  isWin?: boolean;
}) {
  return {
    match_id: input.matchId,
    player_slot: 0,
    radiant_win: input.isWin ?? true,
    duration: 1_800,
    game_mode: 22,
    lobby_type: 7,
    hero_id: input.heroId,
    start_time: Date.parse("2026-08-10T09:00:00.000Z") / 1_000,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadRewardedPlayerIds.mockResolvedValue(new Set());
});

describe("unclaimed star-race win audit", () => {
  it("lists hero wins without awarding stars and counts unavailable profiles", async () => {
    mocks.loadCandidates.mockResolvedValue([
      { playerId: "1", dotaId: "101", playerName: "Winner" },
      { playerId: "2", dotaId: "102", playerName: "No win" },
      { playerId: "3", dotaId: "103", playerName: "Unavailable" },
    ]);
    mocks.fetchRecentPlayerMatches.mockImplementation((dotaId: string) => {
      if (dotaId === "101") return Promise.resolve([match({ matchId: 9001, heroId: 97 })]);
      if (dotaId === "102") return Promise.resolve([match({ matchId: 9002, heroId: 1 })]);
      return Promise.reject(new Error("OpenDota unavailable"));
    });

    const report = await findUnclaimedStarRaceWins(mondayNow);

    expect(report).toMatchObject({
      isAvailable: true,
      dateKey: "2026-08-10",
      questTitle: "Легенда СНГ",
      checkedCount: 3,
      failedCount: 1,
      players: [{
        playerName: "Winner",
        heroName: "Magnus",
        matchId: "9001",
      }],
    });
    expect(mocks.loadRewardedPlayerIds).toHaveBeenCalledWith(
      "2026-08-10",
      ["1"],
    );
  });

  it("removes players who claimed the reward while the audit was running", async () => {
    mocks.loadCandidates.mockResolvedValue([
      { playerId: "1", dotaId: "101", playerName: "Fast clicker" },
    ]);
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      match({ matchId: 9001, heroId: 97 }),
    ]);
    mocks.loadRewardedPlayerIds.mockResolvedValue(new Set(["1"]));

    const report = await findUnclaimedStarRaceWins(mondayNow);

    expect(report.players).toEqual([]);
  });

  it("does not scan a day whose task is not a hero-win challenge", async () => {
    const report = await findUnclaimedStarRaceWins(
      new Date("2026-08-11T12:00:00.000Z"),
    );

    expect(report).toMatchObject({
      isAvailable: false,
      dateKey: "2026-08-11",
      players: [],
    });
    expect(mocks.loadCandidates).not.toHaveBeenCalled();
  });
});
