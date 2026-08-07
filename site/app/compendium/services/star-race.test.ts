import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeCheckAllowance: vi.fn(),
  totalCompendiumStars: vi.fn(),
  totalCommunityCompendiumStars: vi.fn(),
  fetchRecentPlayerMatches: vi.fn(),
  existingStarRaceCompletion: vi.fn(),
  loadStarRaceCompletions: vi.fn(),
  loadStarRaceProgress: vi.fn(),
  loadStarRaceRank: vi.fn(),
  recordStarRaceCompletion: vi.fn(),
  replaceStarRaceProgress: vi.fn(),
  totalStarRaceStars: vi.fn(),
}));

vi.mock("./repository", () => ({
  consumeCheckAllowance: mocks.consumeCheckAllowance,
  totalCompendiumStars: mocks.totalCompendiumStars,
  totalCommunityCompendiumStars: mocks.totalCommunityCompendiumStars,
}));

vi.mock("./opendota", () => ({
  fetchRecentPlayerMatches: mocks.fetchRecentPlayerMatches,
}));

vi.mock("./star-race-repository", () => ({
  existingStarRaceCompletion: mocks.existingStarRaceCompletion,
  loadStarRaceCompletions: mocks.loadStarRaceCompletions,
  loadStarRaceProgress: mocks.loadStarRaceProgress,
  loadStarRaceRank: mocks.loadStarRaceRank,
  recordStarRaceCompletion: mocks.recordStarRaceCompletion,
  replaceStarRaceProgress: mocks.replaceStarRaceProgress,
  totalStarRaceStars: mocks.totalStarRaceStars,
}));

vi.mock("@/lib/player-profile", () => ({
  normalizeDotaAccountId: (value: string) =>
    /^\d+$/.test(value) ? value : null,
}));

import { checkStarRaceQuest } from "./star-race";

const user = {
  discordId: "100",
  dotaId: "301109815",
  username: "discord-user",
  avatarUrl: null,
  playerName: "Player",
  realName: null,
  positions: "1/2",
  serverName: "Player 1/2",
  isAdmin: false,
};

const tuesdayNow = new Date("2026-08-11T12:00:00.000Z");

function winningMatch(matchId: number, towerDamage: number) {
  return {
    match_id: matchId,
    player_slot: 0,
    radiant_win: true,
    duration: 1_800,
    game_mode: 22,
    lobby_type: 7,
    hero_id: 1,
    start_time: Date.parse("2026-08-11T09:00:00.000Z") / 1_000,
    tower_damage: towerDamage,
  };
}

let savedProgress = 0;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(tuesdayNow);
  savedProgress = 0;
  mocks.consumeCheckAllowance.mockResolvedValue(true);
  mocks.totalCompendiumStars.mockResolvedValue(12);
  mocks.totalCommunityCompendiumStars.mockResolvedValue(120);
  mocks.existingStarRaceCompletion.mockResolvedValue(null);
  mocks.loadStarRaceCompletions.mockResolvedValue(new Map());
  mocks.loadStarRaceRank.mockResolvedValue(3);
  mocks.totalStarRaceStars.mockResolvedValue(45);
  mocks.loadStarRaceProgress.mockImplementation(() =>
    Promise.resolve(
      savedProgress === 0
        ? new Map()
        : new Map([
            [
              "2026-08-11",
              {
                current: savedProgress,
                checkedAt: tuesdayNow.toISOString(),
              },
            ],
          ]),
    ),
  );
  mocks.replaceStarRaceProgress.mockImplementation(
    ({ current }: { current: number }) => {
      savedProgress = current;
      return Promise.resolve();
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Tuesday star race building damage check", () => {
  it("rescans the whole day and replaces progress instead of accumulating it", async () => {
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      winningMatch(1001, 10_000),
      winningMatch(1002, 5_000),
    ]);

    const first = await checkStarRaceQuest(user, "2026-08-11", tuesdayNow);
    const second = await checkStarRaceQuest(user, "2026-08-11", tuesdayNow);

    expect(first.completion).toBeNull();
    expect(second.progress?.current).toBe(15_000);
    expect(mocks.replaceStarRaceProgress).toHaveBeenNthCalledWith(1, {
      playerId: user.discordId,
      dateKey: "2026-08-11",
      current: 15_000,
    });
    expect(mocks.replaceStarRaceProgress).toHaveBeenNthCalledWith(2, {
      playerId: user.discordId,
      dateKey: "2026-08-11",
      current: 15_000,
    });
    expect(mocks.fetchRecentPlayerMatches).toHaveBeenCalledWith(user.dotaId, {
      forceRefresh: true,
    });
    expect(mocks.recordStarRaceCompletion).not.toHaveBeenCalled();
  });

  it("awards two stars after the fresh total reaches thirty thousand", async () => {
    const completion = {
      completedAt: tuesdayNow.toISOString(),
      wins: [],
    };
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      winningMatch(2001, 18_000),
      winningMatch(2002, 14_000),
    ]);
    mocks.recordStarRaceCompletion.mockResolvedValue(completion);

    const result = await checkStarRaceQuest(user, "2026-08-11", tuesdayNow);

    expect(result.completion).toBe(completion);
    expect(result.progress?.current).toBe(32_000);
    expect(result.rewardStars).toBe(2);
    expect(mocks.recordStarRaceCompletion).toHaveBeenCalledWith({
      playerId: user.discordId,
      dateKey: "2026-08-11",
      rewardStars: 2,
      wins: [expect.objectContaining({ matchId: "2001" })],
    });
  });
});

describe("single-match star race statistic checks", () => {
  it("awards Wednesday only for a Pudge win with 60,000 hero damage", async () => {
    const wednesdayNow = new Date("2026-08-12T12:00:00.000Z");
    vi.setSystemTime(wednesdayNow);
    const completion = {
      completedAt: wednesdayNow.toISOString(),
      wins: [],
    };
    mocks.fetchRecentPlayerMatches.mockResolvedValue([{
      ...winningMatch(3001, 0),
      hero_id: 14,
      start_time: Date.parse("2026-08-12T09:00:00.000Z") / 1_000,
      hero_damage: 60_000,
    }]);
    mocks.recordStarRaceCompletion.mockResolvedValue(completion);

    const result = await checkStarRaceQuest(
      user,
      "2026-08-12",
      wednesdayNow,
    );

    expect(result.completion).toBe(completion);
    expect(result.rewardStars).toBe(2);
    expect(mocks.fetchRecentPlayerMatches).toHaveBeenCalledWith(user.dotaId, {
      forceRefresh: true,
    });
    expect(mocks.recordStarRaceCompletion).toHaveBeenCalledWith({
      playerId: user.discordId,
      dateKey: "2026-08-12",
      rewardStars: 2,
      wins: [expect.objectContaining({ matchId: "3001", heroId: 14 })],
    });
  });

  it("awards Thursday for 16 kills in a ranked win on any hero", async () => {
    const thursdayNow = new Date("2026-08-13T12:00:00.000Z");
    vi.setSystemTime(thursdayNow);
    const completion = {
      completedAt: thursdayNow.toISOString(),
      wins: [],
    };
    mocks.fetchRecentPlayerMatches.mockResolvedValue([{
      ...winningMatch(4001, 0),
      hero_id: 137,
      start_time: Date.parse("2026-08-13T09:00:00.000Z") / 1_000,
      kills: 16,
    }]);
    mocks.recordStarRaceCompletion.mockResolvedValue(completion);

    const result = await checkStarRaceQuest(
      user,
      "2026-08-13",
      thursdayNow,
    );

    expect(result.completion).toBe(completion);
    expect(mocks.recordStarRaceCompletion).toHaveBeenCalledWith({
      playerId: user.discordId,
      dateKey: "2026-08-13",
      rewardStars: 2,
      wins: [expect.objectContaining({ matchId: "4001", heroId: 137 })],
    });
  });
});
