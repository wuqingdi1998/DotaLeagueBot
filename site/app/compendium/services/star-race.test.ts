import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeCheckAllowance: vi.fn(),
  totalCompendiumStars: vi.fn(),
  totalCommunityCompendiumStars: vi.fn(),
  fetchRecentPlayerMatches: vi.fn(),
  existingStarRaceCompletion: vi.fn(),
  loadStarRaceCompletions: vi.fn(),
  loadPersonalStarRaceStars: vi.fn(),
  loadStarRaceProgress: vi.fn(),
  loadStarRaceRank: vi.fn(),
  recordStarRaceCompletion: vi.fn(),
  replaceStarRaceHeroProgress: vi.fn(),
  replaceStarRaceProgress: vi.fn(),
  checkStarRaceArcanaQuest: vi.fn(),
  loadPendingArcanaVerifications: vi.fn(),
  loadFinalPrediction: vi.fn(),
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
  loadPersonalStarRaceStars: mocks.loadPersonalStarRaceStars,
  loadStarRaceProgress: mocks.loadStarRaceProgress,
  loadStarRaceRank: mocks.loadStarRaceRank,
  recordStarRaceCompletion: mocks.recordStarRaceCompletion,
  replaceStarRaceHeroProgress: mocks.replaceStarRaceHeroProgress,
  replaceStarRaceProgress: mocks.replaceStarRaceProgress,
}));

vi.mock("./star-race-arcana", () => ({
  checkStarRaceArcanaQuest: mocks.checkStarRaceArcanaQuest,
}));

vi.mock("./star-race-arcana-repository", () => ({
  loadPendingArcanaVerifications: mocks.loadPendingArcanaVerifications,
}));

vi.mock("./star-race-final-prediction-repository", () => ({
  loadFinalPrediction: mocks.loadFinalPrediction,
}));

vi.mock("@/lib/player-profile", () => ({
  normalizeDotaAccountId: (value: string) =>
    /^\d+$/.test(value) ? value : null,
}));

import { checkStarRaceQuest, loadStarRace } from "./star-race";
import { compendiumHeroById } from "../model/heroes";

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
let savedProgressDate = "2026-08-11";
let savedHeroWins: Array<{ heroId: number; matchId: string }> = [];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(tuesdayNow);
  savedProgress = 0;
  savedProgressDate = "2026-08-11";
  savedHeroWins = [];
  mocks.consumeCheckAllowance.mockResolvedValue(true);
  mocks.totalCompendiumStars.mockResolvedValue(12);
  mocks.totalCommunityCompendiumStars.mockResolvedValue(120);
  mocks.existingStarRaceCompletion.mockResolvedValue(null);
  mocks.loadStarRaceCompletions.mockResolvedValue(new Map());
  mocks.loadStarRaceRank.mockResolvedValue(3);
  mocks.loadPersonalStarRaceStars.mockResolvedValue(9);
  mocks.loadStarRaceProgress.mockImplementation(() => {
    const entries: Array<[string, {
      current: number;
      checkedAt: string;
      wins: Array<{ hero: ReturnType<typeof compendiumHeroById>; matchId: string }>;
    }]> = [];
    if (savedProgress > 0) {
      entries.push([savedProgressDate, {
        current: savedProgress,
        checkedAt: tuesdayNow.toISOString(),
        wins: [],
      }]);
    }
    if (savedHeroWins.length > 0) {
      entries.push(["2026-08-10", {
        current: savedHeroWins.length,
        checkedAt: new Date().toISOString(),
        wins: savedHeroWins.map((win) => ({
          hero: compendiumHeroById(win.heroId),
          matchId: win.matchId,
        })),
      }]);
    }
    return Promise.resolve(new Map(entries));
  });
  mocks.loadPendingArcanaVerifications.mockResolvedValue(new Map());
  mocks.loadFinalPrediction.mockResolvedValue({
    teams: [],
    selectedPosition: null,
    winnerPosition: null,
    openedAt: null,
  });
  mocks.replaceStarRaceProgress.mockImplementation(
    ({ current, dateKey }: { current: number; dateKey: string }) => {
      savedProgress = current;
      savedProgressDate = dateKey;
      return Promise.resolve();
    },
  );
  mocks.replaceStarRaceHeroProgress.mockImplementation(
    ({ wins }: { wins: Array<{ heroId: number; matchId: string }> }) => {
      savedHeroWins = wins;
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
      {
        ...winningMatch(1003, 100_000),
        game_mode: 23,
        lobby_type: 0,
      },
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

describe("Wednesday cumulative Pudge or Sniper damage check", () => {
  it("sums both heroes' damage from ranked wins and awards at 40,000", async () => {
    const wednesdayNow = new Date("2026-08-12T12:00:00.000Z");
    vi.setSystemTime(wednesdayNow);
    const completion = {
      completedAt: wednesdayNow.toISOString(),
      wins: [],
    };
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      {
        ...winningMatch(3001, 0),
        hero_id: 14,
        start_time: Date.parse("2026-08-12T09:00:00.000Z") / 1_000,
        hero_damage: 21_000,
      },
      {
        ...winningMatch(3002, 0),
        hero_id: 35,
        start_time: Date.parse("2026-08-12T10:00:00.000Z") / 1_000,
        hero_damage: 19_000,
      },
      {
        ...winningMatch(3003, 0),
        hero_id: 1,
        start_time: Date.parse("2026-08-12T11:00:00.000Z") / 1_000,
        hero_damage: 100_000,
      },
    ]);
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
      wins: [
        expect.objectContaining({ matchId: "3001", heroId: 14 }),
        expect.objectContaining({ matchId: "3002", heroId: 35 }),
      ],
    });
  });

  it("uses hero damage rather than building damage for fresh progress", async () => {
    const wednesdayNow = new Date("2026-08-12T12:00:00.000Z");
    vi.setSystemTime(wednesdayNow);
    mocks.fetchRecentPlayerMatches.mockResolvedValue([{
      ...winningMatch(3101, 100_000),
      hero_id: 14,
      start_time: Date.parse("2026-08-12T09:00:00.000Z") / 1_000,
      hero_damage: 30_000,
    }]);

    const first = await checkStarRaceQuest(user, "2026-08-12", wednesdayNow);
    const second = await checkStarRaceQuest(user, "2026-08-12", wednesdayNow);

    expect(first.completion).toBeNull();
    expect(second.progress).toMatchObject({ current: 30_000, target: 40_000 });
    expect(mocks.replaceStarRaceProgress).toHaveBeenNthCalledWith(1, {
      playerId: user.discordId,
      dateKey: "2026-08-12",
      current: 30_000,
    });
    expect(mocks.replaceStarRaceProgress).toHaveBeenNthCalledWith(2, {
      playerId: user.discordId,
      dateKey: "2026-08-12",
      current: 30_000,
    });
    expect(mocks.recordStarRaceCompletion).not.toHaveBeenCalled();
  });
});

describe("single-match star race statistic checks", () => {

  it("awards Thursday for 15 kills in a ranked win on any hero", async () => {
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
      kills: 15,
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

describe("hero-list and Turbo star race checks", () => {
  it("awards Monday after one win on any listed hero", async () => {
    const mondayNow = new Date("2026-08-10T12:00:00.000Z");
    vi.setSystemTime(mondayNow);
    mocks.fetchRecentPlayerMatches.mockResolvedValue([{
      ...winningMatch(5001, 0),
      hero_id: 97,
      start_time: Date.parse("2026-08-10T09:00:00.000Z") / 1_000,
    }]);

    const completion = { completedAt: mondayNow.toISOString(), wins: [] };
    mocks.recordStarRaceCompletion.mockResolvedValue(completion);

    const result = await checkStarRaceQuest(user, "2026-08-10", mondayNow);

    expect(result.completion).toBe(completion);
    expect(mocks.recordStarRaceCompletion).toHaveBeenCalledWith({
      playerId: user.discordId,
      dateKey: "2026-08-10",
      rewardStars: 2,
      wins: [expect.objectContaining({ matchId: "5001", heroId: 97 })],
    });
    expect(mocks.replaceStarRaceHeroProgress).not.toHaveBeenCalled();
  });

  it("awards Sunday's quest for one matchmade Turbo win", async () => {
    const sundayNow = new Date("2026-08-16T12:00:00.000Z");
    vi.setSystemTime(sundayNow);
    const completion = {
      completedAt: sundayNow.toISOString(),
      wins: [],
    };
    mocks.fetchRecentPlayerMatches.mockResolvedValue([{
      ...winningMatch(6001, 0),
      game_mode: 23,
      lobby_type: 0,
      start_time: Date.parse("2026-08-16T09:00:00.000Z") / 1_000,
    }]);
    mocks.recordStarRaceCompletion.mockResolvedValue(completion);

    const result = await checkStarRaceQuest(user, "2026-08-16", sundayNow);

    expect(result.completion).toBe(completion);
    expect(mocks.recordStarRaceCompletion).toHaveBeenCalledWith({
      playerId: user.discordId,
      dateKey: "2026-08-16",
      rewardStars: 2,
      wins: [expect.objectContaining({ matchId: "6001" })],
    });
  });
});

describe("second-week star race checks", () => {
  it("awards three stars after two Monday ranked wins", async () => {
    const mondayNow = new Date("2026-08-17T12:00:00.000Z");
    vi.setSystemTime(mondayNow);
    const completion = { completedAt: mondayNow.toISOString(), wins: [] };
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      {
        ...winningMatch(7001, 0),
        start_time: Date.parse("2026-08-17T09:00:00.000Z") / 1_000,
      },
      {
        ...winningMatch(7002, 0),
        start_time: Date.parse("2026-08-17T10:00:00.000Z") / 1_000,
      },
    ]);
    mocks.recordStarRaceCompletion.mockResolvedValue(completion);

    const result = await checkStarRaceQuest(user, "2026-08-17", mondayNow);

    expect(result.completion).toBe(completion);
    expect(result.rewardStars).toBe(3);
    expect(mocks.replaceStarRaceProgress).toHaveBeenCalledWith({
      playerId: user.discordId,
      dateKey: "2026-08-17",
      current: 2,
    });
    expect(mocks.recordStarRaceCompletion).toHaveBeenCalledWith({
      playerId: user.discordId,
      dateKey: "2026-08-17",
      rewardStars: 3,
      wins: [
        expect.objectContaining({ matchId: "7001" }),
        expect.objectContaining({ matchId: "7002" }),
      ],
    });
  });

  it("returns the five-minute Arcana verification to the button", async () => {
    const thursdayNow = new Date("2026-08-20T12:00:00.000Z");
    vi.setSystemTime(thursdayNow);
    const pendingVerification = {
      checkAfter: "2026-08-20T12:05:00.000Z",
      matchCount: 1,
    };
    mocks.fetchRecentPlayerMatches.mockResolvedValue([{
      ...winningMatch(8001, 0),
      start_time: Date.parse("2026-08-20T09:00:00.000Z") / 1_000,
    }]);
    mocks.checkStarRaceArcanaQuest.mockResolvedValue({
      completion: null,
      pendingVerification,
    });

    const result = await checkStarRaceQuest(
      user,
      "2026-08-20",
      thursdayNow,
    );

    expect(result.pendingVerification).toEqual(pendingVerification);
    expect(mocks.checkStarRaceArcanaQuest).toHaveBeenCalledWith({
      playerId: user.discordId,
      dotaId: user.dotaId,
      dateKey: "2026-08-20",
      rewardStars: 3,
      wins: [expect.objectContaining({ matchId: "8001" })],
      now: thursdayNow,
    });
  });
});

describe("final prediction opening", () => {
  it("keeps the quest upcoming until the organizer saves teams", async () => {
    const now = new Date("2026-08-21T19:00:00.000Z");

    const race = await loadStarRace(user, now);
    const prediction = race.quests.find(
      (quest) => quest.dateKey === "2026-08-22",
    );

    expect(prediction).toMatchObject({
      phase: "upcoming",
      finalPrediction: { openedAt: null },
    });
  });

  it("uses the first team save as the quest opening moment", async () => {
    const openedAt = "2026-08-21T18:30:00.000Z";
    mocks.loadFinalPrediction.mockResolvedValue({
      teams: ["A", "B", "C", "D", "E", "F"],
      selectedPosition: null,
      winnerPosition: null,
      openedAt,
    });

    const race = await loadStarRace(user, new Date("2026-08-21T19:00:00.000Z"));
    const prediction = race.quests.find(
      (quest) => quest.dateKey === "2026-08-22",
    );

    expect(prediction).toMatchObject({
      phase: "active",
      startsAt: openedAt,
      endsAt: "2026-08-22T02:00:00.000Z",
    });
  });
});
