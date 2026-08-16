import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchOpenDotaMatchDetails: vi.fn(),
  hasPlayerEquippedArcana: vi.fn(),
  requestOpenDotaMatchParse: vi.fn(),
  attachArcanaParseJob: vi.fn(),
  finishArcanaCheck: vi.fn(),
  loadArcanaChecks: vi.fn(),
  loadDueArcanaChecks: vi.fn(),
  postponeArcanaCheck: vi.fn(),
  releaseArcanaCheck: vi.fn(),
  reserveArcanaCheck: vi.fn(),
  saveFinishedArcanaCheck: vi.fn(),
  recordStarRaceCompletion: vi.fn(),
}));

vi.mock("./opendota-match-details", () => ({
  fetchOpenDotaMatchDetails: mocks.fetchOpenDotaMatchDetails,
  hasPlayerEquippedArcana: mocks.hasPlayerEquippedArcana,
  requestOpenDotaMatchParse: mocks.requestOpenDotaMatchParse,
}));

vi.mock("./star-race-arcana-repository", () => ({
  attachArcanaParseJob: mocks.attachArcanaParseJob,
  finishArcanaCheck: mocks.finishArcanaCheck,
  loadArcanaChecks: mocks.loadArcanaChecks,
  loadDueArcanaChecks: mocks.loadDueArcanaChecks,
  postponeArcanaCheck: mocks.postponeArcanaCheck,
  releaseArcanaCheck: mocks.releaseArcanaCheck,
  reserveArcanaCheck: mocks.reserveArcanaCheck,
  saveFinishedArcanaCheck: mocks.saveFinishedArcanaCheck,
}));

vi.mock("./star-race-repository", () => ({
  recordStarRaceCompletion: mocks.recordStarRaceCompletion,
}));

import {
  checkStarRaceArcanaQuest,
  processDueArcanaChecks,
} from "./star-race-arcana";

const now = new Date("2026-08-20T12:00:00.000Z");
const win = {
  heroId: 1,
  matchId: "8946503036",
  endedAt: new Date("2026-08-20T11:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadArcanaChecks.mockResolvedValue(new Map());
  mocks.loadDueArcanaChecks.mockResolvedValue([]);
});

describe("Arcana star-race verification", () => {
  it("submits an unparsed match and schedules a five-minute check", async () => {
    const checkAfter = new Date("2026-08-20T12:05:00.000Z").toISOString();
    mocks.fetchOpenDotaMatchDetails.mockResolvedValue({
      matchId: win.matchId,
      hasParsed: false,
      players: [],
    });
    mocks.reserveArcanaCheck.mockResolvedValue({
      isNew: true,
      check: { matchId: win.matchId, heroId: win.heroId, checkAfter },
    });
    mocks.requestOpenDotaMatchParse.mockResolvedValue("job-1");

    const result = await checkStarRaceArcanaQuest({
      playerId: "100",
      dotaId: "301109815",
      dateKey: "2026-08-20",
      rewardStars: 3,
      wins: [win],
      now,
    });

    expect(result).toEqual({
      completion: null,
      pendingVerification: { checkAfter, matchCount: 1 },
    });
    expect(mocks.requestOpenDotaMatchParse).toHaveBeenCalledWith(win.matchId);
    expect(mocks.attachArcanaParseJob).toHaveBeenCalledWith({
      playerId: "100",
      dateKey: "2026-08-20",
      matchId: win.matchId,
      jobId: "job-1",
    });
  });

  it("awards the quest when a parsed match contains the player's Arcana", async () => {
    const details = {
      matchId: win.matchId,
      hasParsed: true,
      players: [{ accountId: "301109815", cosmetics: [] }],
    };
    const completion = { completedAt: now.toISOString(), wins: [] };
    mocks.fetchOpenDotaMatchDetails.mockResolvedValue(details);
    mocks.hasPlayerEquippedArcana.mockReturnValue(true);
    mocks.recordStarRaceCompletion.mockResolvedValue(completion);

    await expect(checkStarRaceArcanaQuest({
      playerId: "100",
      dotaId: "301109815",
      dateKey: "2026-08-20",
      rewardStars: 3,
      wins: [win],
      now,
    })).resolves.toEqual({
      completion,
      pendingVerification: null,
    });
    expect(mocks.saveFinishedArcanaCheck).toHaveBeenCalledWith({
      playerId: "100",
      dateKey: "2026-08-20",
      win,
      hasArcana: true,
    });
    expect(mocks.recordStarRaceCompletion).toHaveBeenCalledWith({
      playerId: "100",
      dateKey: "2026-08-20",
      rewardStars: 3,
      wins: [win],
    });
  });

  it("postpones a background check when OpenDota omits the requested player", async () => {
    const dueCheck = {
      playerId: "100",
      dotaId: "301109815",
      dateKey: "2026-08-20",
      matchId: win.matchId,
      heroId: win.heroId,
      jobId: "job-1",
      checkAfter: now.toISOString(),
      finishedAt: null,
      hasArcana: null,
    };
    mocks.loadDueArcanaChecks.mockResolvedValue([dueCheck]);
    mocks.fetchOpenDotaMatchDetails.mockResolvedValue({
      matchId: win.matchId,
      hasParsed: true,
      players: [{ accountId: "someone-else", cosmetics: [] }],
    });

    await expect(processDueArcanaChecks()).resolves.toEqual({
      checked: 1,
      completed: 0,
      postponed: 1,
    });
    expect(mocks.postponeArcanaCheck).toHaveBeenCalledWith({
      playerId: "100",
      dateKey: "2026-08-20",
      matchId: win.matchId,
    });
    expect(mocks.finishArcanaCheck).not.toHaveBeenCalled();
  });
});
