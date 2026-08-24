import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadState: vi.fn(),
  recordCompletion: vi.fn(),
  saveSelection: vi.fn(),
  fetchMatches: vi.fn(),
  consumeAllowance: vi.fn(),
  totalStars: vi.fn(),
  communityStars: vi.fn(),
}));

vi.mock("./rune-challenge-repository", () => ({
  loadRuneChallengeStateRecord: mocks.loadState,
  recordRuneChallengeCompletion: mocks.recordCompletion,
  saveRuneChallengeSelection: mocks.saveSelection,
}));

vi.mock("./opendota", () => ({
  fetchRecentPlayerMatches: mocks.fetchMatches,
}));

vi.mock("./repository", () => ({
  consumeCheckAllowance: mocks.consumeAllowance,
  totalCompendiumStars: mocks.totalStars,
  totalCommunityCompendiumStars: mocks.communityStars,
}));

vi.mock("@/lib/player-profile", () => ({
  normalizeDotaAccountId: (value: string) => value || null,
}));

import { checkRuneChallenge, selectRuneChallengeHero } from "./rune-challenge";

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

function state(selectedAt: Date) {
  return {
    accessRoleName: "Руна Ускорения",
    selection: {
      heroId: 1,
      selectedAt,
      nextChangeAt: new Date(selectedAt.getTime() + 7 * 86_400_000),
      canChangeHero: false,
    },
    completion: null,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
  vi.resetAllMocks();
  mocks.consumeAllowance.mockResolvedValue(true);
  mocks.totalStars.mockResolvedValue(8);
  mocks.communityStars.mockResolvedValue(80);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rune challenge", () => {
  it("rejects access immediately after an eligible role is removed", async () => {
    mocks.loadState.mockResolvedValue({
      accessRoleName: null,
      selection: null,
      completion: null,
    });

    await expect(checkRuneChallenge(user)).rejects.toMatchObject({
      code: "RUNE_ACCESS_REQUIRED",
    });
    expect(mocks.fetchMatches).not.toHaveBeenCalled();
  });

  it("accepts only heroes from the compendium catalog", async () => {
    await expect(selectRuneChallengeHero(user, 9999)).rejects.toMatchObject({
      code: "RUNE_HERO_INVALID",
    });
    expect(mocks.saveSelection).not.toHaveBeenCalled();
  });

  it("allows Wednesday's Pudge quest hero in Rune Challenge", async () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    mocks.saveSelection.mockResolvedValue(undefined);
    mocks.loadState.mockResolvedValue({
      ...state(now),
      selection: { ...state(now).selection, heroId: 14 },
    });

    await selectRuneChallengeHero(user, 14, now);

    expect(mocks.saveSelection).toHaveBeenCalledWith({
      playerId: user.discordId,
      heroId: 14,
    });
  });

  it("checks a Rune win on a hero from the current star-race quest", async () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const selectedAt = new Date(now.getTime() - 60 * 60 * 1_000);
    const currentState = {
      ...state(selectedAt),
      selection: { ...state(selectedAt).selection, heroId: 14 },
    };
    const completion = {
      matchedHeroId: 14,
      matchedMatchId: "9014",
      completedAt: now.toISOString(),
    };
    mocks.loadState
      .mockResolvedValueOnce(currentState)
      .mockResolvedValueOnce(currentState)
      .mockResolvedValueOnce({ ...currentState, completion });
    mocks.fetchMatches.mockResolvedValue([{
      match_id: 9014,
      player_slot: 0,
      radiant_win: true,
      duration: 600,
      game_mode: 22,
      lobby_type: 7,
      hero_id: 14,
      start_time: Math.floor((now.getTime() - 30 * 60 * 1_000) / 1_000),
    }]);
    mocks.recordCompletion.mockResolvedValue(completion);

    await expect(checkRuneChallenge(user, now)).resolves.toMatchObject({
      runeChallenge: { completion },
    });
    expect(mocks.recordCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ heroId: 14, matchId: "9014" }),
    );
  });

  it("awards two stars for a Friday ranked win after hero selection", async () => {
    const now = new Date("2026-08-07T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const selectedAt = new Date(now.getTime() - 60 * 60 * 1_000);
    const currentState = state(selectedAt);
    const completion = {
      matchedHeroId: 1,
      matchedMatchId: "9001",
      completedAt: now.toISOString(),
    };
    mocks.loadState
      .mockResolvedValueOnce(currentState)
      .mockResolvedValueOnce(currentState)
      .mockResolvedValueOnce({ ...currentState, completion });
    mocks.fetchMatches.mockResolvedValue([
      {
        match_id: 9001,
        player_slot: 0,
        radiant_win: true,
        duration: 600,
        game_mode: 22,
        lobby_type: 7,
        hero_id: 1,
        start_time: Math.floor((now.getTime() - 30 * 60 * 1_000) / 1_000),
      },
    ]);
    mocks.recordCompletion.mockResolvedValue(completion);

    await expect(checkRuneChallenge(user, now)).resolves.toMatchObject({
      totalStars: 8,
      communityStars: 80,
      runeChallenge: { completion },
    });
    expect(mocks.recordCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        heroId: 1,
        matchId: "9001",
        rewardStars: 2,
      }),
    );
  });

  it("does not count a win completed before the hero was selected", async () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const selectedAt = new Date(now.getTime() - 10 * 60 * 1_000);
    mocks.loadState.mockResolvedValue(state(selectedAt));
    mocks.fetchMatches.mockResolvedValue([
      {
        match_id: 9002,
        player_slot: 0,
        radiant_win: true,
        duration: 600,
        game_mode: 22,
        lobby_type: 7,
        hero_id: 1,
        start_time: Math.floor((now.getTime() - 60 * 60 * 1_000) / 1_000),
      },
    ]);

    await expect(checkRuneChallenge(user, now)).rejects.toMatchObject({
      code: "NO_MATCH",
    });
    expect(mocks.recordCompletion).not.toHaveBeenCalled();
  });
});
