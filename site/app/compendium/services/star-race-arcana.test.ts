import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchOpenDotaMatchDetails: vi.fn(),
  hasPlayerEquippedArcana: vi.fn(),
  requestOpenDotaMatchParse: vi.fn(),
  hasPlayerEquippedArcanaInReplay: vi.fn(),
  fetchStratzReplayUrl: vi.fn(),
  attachArcanaParseJob: vi.fn(),
  finishArcanaCheck: vi.fn(),
  loadArcanaChecks: vi.fn(),
  loadDueArcanaChecks: vi.fn(),
  postponeArcanaCheck: vi.fn(),
  reserveArcanaCheck: vi.fn(),
  saveFinishedArcanaCheck: vi.fn(),
  recordStarRaceCompletion: vi.fn(),
}));

vi.mock("./replay-arcana", () => ({
  hasPlayerEquippedArcanaInReplay: mocks.hasPlayerEquippedArcanaInReplay,
}));

vi.mock("./stratz-replay", () => ({
  fetchStratzReplayUrl: mocks.fetchStratzReplayUrl,
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
  heroId: 86,
  matchId: "8946503036",
  endedAt: new Date("2026-08-20T11:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadArcanaChecks.mockResolvedValue(new Map());
  mocks.loadDueArcanaChecks.mockResolvedValue([]);
  mocks.fetchStratzReplayUrl.mockResolvedValue(null);
});

describe("Arcana star-race verification", () => {
  it("does not schedule replay checks for heroes without an Arcana", async () => {
    await expect(checkStarRaceArcanaQuest({
      playerId: "100",
      dotaId: "301109815",
      dateKey: "2026-08-20",
      rewardStars: 3,
      wins: [{ ...win, heroId: 19 }],
      now,
    })).rejects.toMatchObject({ code: "NO_MATCH" });

    expect(mocks.loadArcanaChecks).not.toHaveBeenCalled();
    expect(mocks.fetchOpenDotaMatchDetails).not.toHaveBeenCalled();
    expect(mocks.reserveArcanaCheck).not.toHaveBeenCalled();
  });

  it("submits an unparsed match and schedules a five-minute check", async () => {
    const checkAfter = new Date("2026-08-20T12:05:00.000Z").toISOString();
    mocks.fetchOpenDotaMatchDetails.mockResolvedValue({
      matchId: win.matchId,
      hasParsed: false,
      hasCosmeticData: false,
      replayUrl: null,
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
      hasCosmeticData: true,
      replayUrl: "http://replay123.valve.net/570/8946503036_456.dem.bz2",
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
      hasCosmeticData: true,
      replayUrl: null,
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

  it("awards a background check from replay wearables when OpenDota has no cosmetics", async () => {
    const dueCheck = {
      playerId: "100",
      dotaId: "301109815",
      dateKey: "2026-08-20",
      matchId: win.matchId,
      heroId: win.heroId,
      jobId: null,
      checkAfter: now.toISOString(),
      finishedAt: null,
      hasArcana: null,
    };
    const replayUrl = "http://replay123.valve.net/570/8946503036_456.dem.bz2";
    mocks.loadDueArcanaChecks.mockResolvedValue([dueCheck]);
    mocks.fetchOpenDotaMatchDetails.mockResolvedValue({
      matchId: win.matchId,
      hasParsed: true,
      hasCosmeticData: false,
      replayUrl,
      players: [{ accountId: "301109815", cosmetics: [] }],
    });
    mocks.hasPlayerEquippedArcanaInReplay.mockResolvedValue(true);
    mocks.recordStarRaceCompletion.mockResolvedValue({ completedAt: now.toISOString() });

    await expect(processDueArcanaChecks()).resolves.toEqual({
      checked: 1,
      completed: 1,
      postponed: 0,
    });
    expect(mocks.hasPlayerEquippedArcanaInReplay).toHaveBeenCalledWith({
      matchId: win.matchId,
      replayUrl,
      dotaId: "301109815",
    });
    expect(mocks.finishArcanaCheck).toHaveBeenCalledWith({
      playerId: "100",
      dateKey: "2026-08-20",
      matchId: win.matchId,
      hasArcana: true,
    });
  });

  it("finishes an old queued check without downloading a replay for a non-Arcana hero", async () => {
    const dueCheck = {
      playerId: "100",
      dotaId: "301109815",
      dateKey: "2026-08-20",
      matchId: "8955080675",
      heroId: 19,
      jobId: null,
      checkAfter: now.toISOString(),
      finishedAt: null,
      hasArcana: null,
    };
    mocks.loadDueArcanaChecks.mockResolvedValue([dueCheck]);

    await expect(processDueArcanaChecks()).resolves.toEqual({
      checked: 1,
      completed: 0,
      postponed: 0,
    });
    expect(mocks.finishArcanaCheck).toHaveBeenCalledWith({
      playerId: "100",
      dateKey: "2026-08-20",
      matchId: "8955080675",
      hasArcana: false,
    });
    expect(mocks.fetchOpenDotaMatchDetails).not.toHaveBeenCalled();
    expect(mocks.hasPlayerEquippedArcanaInReplay).not.toHaveBeenCalled();
  });
});
