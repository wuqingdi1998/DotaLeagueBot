import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompendiumError } from "../model/errors";

const mocks = vi.hoisted(() => ({
  ensureDailyQuestSet: vi.fn(),
  loadDailyQuests: vi.fn(),
  totalCompendiumStars: vi.fn(),
  questForCurrentDay: vi.fn(),
  existingCompletion: vi.fn(),
  consumeCheckAllowance: vi.fn(),
  recordQuestCompletion: vi.fn(),
  fetchRecentPlayerMatches: vi.fn(),
}));

vi.mock("./repository", () => ({
  ensureDailyQuestSet: mocks.ensureDailyQuestSet,
  loadDailyQuests: mocks.loadDailyQuests,
  totalCompendiumStars: mocks.totalCompendiumStars,
  questForCurrentDay: mocks.questForCurrentDay,
  existingCompletion: mocks.existingCompletion,
  consumeCheckAllowance: mocks.consumeCheckAllowance,
  recordQuestCompletion: mocks.recordQuestCompletion,
}));

vi.mock("./opendota", () => ({
  fetchRecentPlayerMatches: mocks.fetchRecentPlayerMatches,
}));

vi.mock("@/lib/player-profile", () => ({
  normalizeDotaAccountId: (value: string) =>
    /^\d+$/.test(value) ? value : null,
}));

import { checkDailyQuest } from "./compendium";

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

  it("returns an existing completion without another OpenDota request or reward", async () => {
    mocks.existingCompletion.mockResolvedValue(completion);
    mocks.totalCompendiumStars.mockResolvedValue(7);
    await expect(checkDailyQuest(user, "1")).resolves.toEqual({
      completion,
      totalStars: 7,
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
