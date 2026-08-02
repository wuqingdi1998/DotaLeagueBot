import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompendiumError } from "../model/errors";

const mocks = vi.hoisted(() => ({
  ensureDailyQuestSet: vi.fn(),
  loadDailyQuests: vi.fn(),
  totalCompendiumStars: vi.fn(),
  totalCommunityCompendiumStars: vi.fn(),
  questForCurrentDay: vi.fn(),
  existingCompletion: vi.fn(),
  consumeCheckAllowance: vi.fn(),
  recordQuestCompletion: vi.fn(),
  fetchRecentPlayerMatches: vi.fn(),
  dailyRerollsRemaining: vi.fn(),
  recordDailyQuestReroll: vi.fn(),
  loadDailyPredictions: vi.fn(),
}));

vi.mock("./repository", () => ({
  ensureDailyQuestSet: mocks.ensureDailyQuestSet,
  loadDailyQuests: mocks.loadDailyQuests,
  totalCompendiumStars: mocks.totalCompendiumStars,
  totalCommunityCompendiumStars: mocks.totalCommunityCompendiumStars,
  questForCurrentDay: mocks.questForCurrentDay,
  existingCompletion: mocks.existingCompletion,
  consumeCheckAllowance: mocks.consumeCheckAllowance,
  recordQuestCompletion: mocks.recordQuestCompletion,
}));

vi.mock("./opendota", () => ({
  fetchRecentPlayerMatches: mocks.fetchRecentPlayerMatches,
}));

vi.mock("./reroll-repository", () => ({
  dailyRerollsRemaining: mocks.dailyRerollsRemaining,
  recordDailyQuestReroll: mocks.recordDailyQuestReroll,
}));

vi.mock("./prediction-repository", () => ({
  loadDailyPredictions: mocks.loadDailyPredictions,
}));

vi.mock("@/lib/player-profile", () => ({
  normalizeDotaAccountId: (value: string) =>
    /^\d+$/.test(value) ? value : null,
}));

import { checkDailyQuest, rerollDailyQuest } from "./compendium";

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

const completion = {
  matchedHeroId: 1,
  matchedMatchId: "9001",
  completedAt: "2026-08-01T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.questForCurrentDay.mockResolvedValue({ id: "1", heroIds: [1, 2, 3, 4] });
  mocks.existingCompletion.mockResolvedValue(null);
  mocks.consumeCheckAllowance.mockResolvedValue(true);
  mocks.totalCompendiumStars.mockResolvedValue(1);
  mocks.totalCommunityCompendiumStars.mockResolvedValue(12);
  mocks.dailyRerollsRemaining.mockResolvedValue(1);
  mocks.loadDailyPredictions.mockResolvedValue([]);
});

describe("protected quest checks", () => {
  it("rejects a user without a valid Dota ID before any external request", async () => {
    await expect(checkDailyQuest({ ...user, dotaId: "" }, "1")).rejects.toMatchObject({
      code: "MISSING_DOTA_ID",
    });
    expect(mocks.fetchRecentPlayerMatches).not.toHaveBeenCalled();
  });

  it("rejects an old quest before looking for an existing reward", async () => {
    mocks.questForCurrentDay.mockResolvedValue(null);
    await expect(checkDailyQuest(user, "99")).rejects.toMatchObject({
      code: "STALE_QUEST",
    });
    expect(mocks.existingCompletion).not.toHaveBeenCalled();
  });

  it("checks the user's replacement heroes instead of the shared card", async () => {
    mocks.fetchRecentPlayerMatches.mockResolvedValue([]);
    await expect(checkDailyQuest(user, "1")).rejects.toMatchObject({
      code: "NO_MATCH",
    });
    expect(mocks.questForCurrentDay).toHaveBeenCalledWith(
      "1",
      expect.any(String),
      user.discordId,
    );
  });

  it("returns an existing completion without another OpenDota request or reward", async () => {
    mocks.existingCompletion.mockResolvedValue(completion);
    mocks.totalCompendiumStars.mockResolvedValue(7);
    await expect(checkDailyQuest(user, "1")).resolves.toEqual({
      completion,
      totalStars: 7,
      communityStars: 12,
      rerollsRemaining: 1,
      quests: undefined,
    });
    expect(mocks.fetchRecentPlayerMatches).not.toHaveBeenCalled();
    expect(mocks.recordQuestCompletion).not.toHaveBeenCalled();
  });

  it("does not record a reward when OpenDota is unavailable", async () => {
    mocks.fetchRecentPlayerMatches.mockRejectedValue(
      new CompendiumError("OPEN_DOTA_UNAVAILABLE", "offline"),
    );
    await expect(checkDailyQuest(user, "1")).rejects.toMatchObject({
      code: "OPEN_DOTA_UNAVAILABLE",
    });
    expect(mocks.recordQuestCompletion).not.toHaveBeenCalled();
  });

  it("stops excessive checks before contacting OpenDota", async () => {
    mocks.consumeCheckAllowance.mockResolvedValue(false);
    await expect(checkDailyQuest(user, "1")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    expect(mocks.fetchRecentPlayerMatches).not.toHaveBeenCalled();
  });
});

describe("daily reroll", () => {
  it("replaces only the selected quest and spends today's reroll", async () => {
    const replacementQuest = {
      id: "2",
      position: 2,
      heroes: [],
      completion: null,
    };
    mocks.loadDailyQuests.mockResolvedValue([replacementQuest]);
    mocks.dailyRerollsRemaining.mockResolvedValue(0);

    await expect(rerollDailyQuest(user, "2")).resolves.toEqual({
      quest: replacementQuest,
      rerollsRemaining: 0,
    });
    expect(mocks.recordDailyQuestReroll).toHaveBeenCalledWith({
      playerId: user.discordId,
      questId: "2",
      dateKey: expect.any(String),
    });
  });

  it("keeps a used reroll rejected by the persistent daily limit", async () => {
    mocks.recordDailyQuestReroll.mockRejectedValue(
      new CompendiumError("REROLL_USED", "used"),
    );
    await expect(rerollDailyQuest(user, "2")).rejects.toMatchObject({
      code: "REROLL_USED",
    });
  });
});
