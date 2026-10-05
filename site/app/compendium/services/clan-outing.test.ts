import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recentMatches: vi.fn(),
  matchDetails: vi.fn(),
  loadCompletion: vi.fn(),
  loadClanMates: vi.fn(),
  recordPair: vi.fn(),
  consumeAllowance: vi.fn(),
  totalStars: vi.fn(),
}));

vi.mock("./opendota", () => ({ fetchRecentPlayerMatches: mocks.recentMatches }));
vi.mock("./opendota-match-details", () => ({ fetchOpenDotaMatchDetails: mocks.matchDetails }));
vi.mock("./clan-outing-repository", () => ({
  loadClanOutingCompletion: mocks.loadCompletion,
  loadClanMateDotaIds: mocks.loadClanMates,
  recordClanOutingPair: mocks.recordPair,
}));
vi.mock("./repository", () => ({
  consumeCheckAllowance: mocks.consumeAllowance,
  totalCompendiumStars: mocks.totalStars,
}));

import { checkClanOuting } from "./clan-outing";

describe("October clan outing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadCompletion.mockResolvedValue(null);
    mocks.consumeAllowance.mockResolvedValue(true);
    mocks.totalStars.mockResolvedValue(12);
    mocks.loadClanMates.mockResolvedValue(new Map([
      ["202", { playerId: "2", playerName: "Clan mate" }],
    ]));
    mocks.recentMatches.mockResolvedValue([{
      match_id: 9001,
      account_id: 101,
      player_slot: 0,
      radiant_win: true,
      duration: 1800,
      game_mode: 22,
      lobby_type: 7,
      hero_id: 1,
      start_time: Date.parse("2026-10-05T10:00:00Z") / 1000,
    }]);
    mocks.matchDetails.mockResolvedValue({
      players: [
        { accountId: "101", playerSlot: 0 },
        { accountId: "202", playerSlot: 1 },
      ],
    });
    mocks.recordPair.mockResolvedValue({
      matchId: "9001",
      partnerPlayerId: "2",
      partnerName: "Clan mate",
      completedAt: "2026-10-05T11:00:00Z",
    });
  });

  it("awards both clan mates after a ranked win on the same team", async () => {
    const result = await checkClanOuting({
      discordId: "1",
      dotaId: "101",
    } as never, new Date("2026-10-05T12:00:00Z"));

    expect(result.completion.partnerName).toBe("Clan mate");
    expect(mocks.recordPair).toHaveBeenCalledWith(expect.objectContaining({
      playerId: "1",
      partnerPlayerId: "2",
      matchId: "9001",
    }));
  });
});
