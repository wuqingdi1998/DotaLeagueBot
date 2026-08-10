import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureDailyQuestSet: vi.fn(),
  fetchRecentPlayerMatches: vi.fn(),
  loadCandidates: vi.fn(),
  loadClaimedKeys: vi.fn(),
}));

vi.mock("./opendota", () => ({
  fetchRecentPlayerMatches: mocks.fetchRecentPlayerMatches,
}));

vi.mock("./repository", () => ({
  ensureDailyQuestSet: mocks.ensureDailyQuestSet,
}));

vi.mock("./unclaimed-challenges-repository", () => ({
  loadUnclaimedChallengeCandidates: mocks.loadCandidates,
  loadClaimedChallengeKeys: mocks.loadClaimedKeys,
}));

import { findUnclaimedChallenges } from "./unclaimed-challenges";

function winningMatch(input: {
  matchId: number;
  heroId: number;
  startTime: string;
  towerDamage?: number;
}) {
  return {
    match_id: input.matchId,
    player_slot: 0,
    radiant_win: true,
    duration: 1_800,
    game_mode: 22,
    lobby_type: 7,
    hero_id: input.heroId,
    start_time: Date.parse(input.startTime) / 1_000,
    tower_damage: input.towerDamage ?? 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureDailyQuestSet.mockResolvedValue("quest-set");
  mocks.loadClaimedKeys.mockResolvedValue(new Set());
});

describe("unclaimed compendium challenge audit", () => {
  it("finds daily quests 1-4 and Tuesday's building-damage race together", async () => {
    mocks.loadCandidates.mockResolvedValue([{
      playerId: "1",
      dotaId: "101",
      playerName: "All quests player",
      dailyQuests: [
        { id: "11", position: 1, heroIds: [1] },
        { id: "12", position: 2, heroIds: [2] },
        { id: "13", position: 3, heroIds: [3] },
        { id: "14", position: 4, heroIds: [4] },
      ],
      isStarRaceCandidate: true,
    }]);
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      winningMatch({
        matchId: 9001,
        heroId: 1,
        startTime: "2026-08-11T07:00:00.000Z",
        towerDamage: 8_000,
      }),
      winningMatch({
        matchId: 9002,
        heroId: 2,
        startTime: "2026-08-11T08:00:00.000Z",
        towerDamage: 8_000,
      }),
      winningMatch({
        matchId: 9003,
        heroId: 3,
        startTime: "2026-08-11T09:00:00.000Z",
        towerDamage: 8_000,
      }),
      winningMatch({
        matchId: 9004,
        heroId: 4,
        startTime: "2026-08-11T10:00:00.000Z",
        towerDamage: 8_000,
      }),
    ]);

    const report = await findUnclaimedChallenges(
      new Date("2026-08-11T12:00:00.000Z"),
    );

    expect(report.checkedCount).toBe(1);
    expect(report.players).toHaveLength(1);
    expect(report.players[0].challenges).toEqual([
      expect.objectContaining({ kind: "daily", title: "Испытание 1" }),
      expect.objectContaining({ kind: "daily", title: "Испытание 2" }),
      expect.objectContaining({ kind: "daily", title: "Испытание 3" }),
      expect.objectContaining({ kind: "daily", title: "Испытание 4" }),
      expect.objectContaining({
        kind: "star-race",
        title: "Побеждает тот, у кого упадёт трон",
        detail: expect.stringContaining("32 000 / 30 000"),
      }),
    ]);
    expect(mocks.fetchRecentPlayerMatches).toHaveBeenCalledTimes(1);
  });

  it("still finds daily quests when no star-race task is active", async () => {
    mocks.loadCandidates.mockResolvedValue([{
      playerId: "1",
      dotaId: "101",
      playerName: "Daily player",
      dailyQuests: [{ id: "21", position: 1, heroIds: [1] }],
      isStarRaceCandidate: false,
    }]);
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      winningMatch({
        matchId: 9101,
        heroId: 1,
        startTime: "2026-08-17T07:00:00.000Z",
      }),
    ]);

    const report = await findUnclaimedChallenges(
      new Date("2026-08-17T12:00:00.000Z"),
    );

    expect(report.players[0].challenges).toEqual([
      expect.objectContaining({ kind: "daily", title: "Испытание 1" }),
    ]);
  });

  it("removes rewards claimed while the audit was running", async () => {
    mocks.loadCandidates.mockResolvedValue([{
      playerId: "1",
      dotaId: "101",
      playerName: "Fast clicker",
      dailyQuests: [{ id: "31", position: 1, heroIds: [1] }],
      isStarRaceCandidate: true,
    }]);
    mocks.fetchRecentPlayerMatches.mockResolvedValue([
      winningMatch({
        matchId: 9201,
        heroId: 1,
        startTime: "2026-08-11T07:00:00.000Z",
        towerDamage: 31_000,
      }),
    ]);
    mocks.loadClaimedKeys.mockResolvedValue(new Set([
      "daily:1:31",
      "star-race:1:2026-08-11",
    ]));

    const report = await findUnclaimedChallenges(
      new Date("2026-08-11T12:00:00.000Z"),
    );

    expect(report.players).toEqual([]);
  });
});
