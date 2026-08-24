import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  saveTeams: vi.fn(),
  savePick: vi.fn(),
  recordWinner: vi.fn(),
}));

vi.mock("./star-race-final-prediction-repository", () => ({
  loadFinalPrediction: mocks.load,
  saveFinalPredictionTeams: mocks.saveTeams,
  saveFinalPredictionPick: mocks.savePick,
  recordFinalPredictionWinner: mocks.recordWinner,
}));

vi.mock("./participant", () => ({
  requireCompendiumDotaId: () => "301109815",
}));

import {
  configureFinalPrediction,
  finishFinalPrediction,
  submitFinalPrediction,
} from "./star-race-final-prediction";

const user = {
  discordId: "100",
  dotaId: "301109815",
  username: "user",
  avatarUrl: null,
  playerName: "Player",
  realName: null,
  positions: null,
  serverName: "Player",
  isAdmin: true,
};

describe("star race final prediction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T18:00:00.000Z"));
    vi.clearAllMocks();
    mocks.load.mockResolvedValue({
      teams: [],
      selectedPosition: null,
      winnerPosition: null,
      openedAt: null,
    });
    mocks.saveTeams.mockResolvedValue({
      isOpened: true,
      notifiedPlayers: 4,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires six distinct team names", async () => {
    await expect(configureFinalPrediction({ administrator: user, teams: ["A", "A", "B", "C", "D", "E"] }))
      .rejects.toMatchObject({ code: "PREDICTION_INVALID" });
    expect(mocks.saveTeams).not.toHaveBeenCalled();
  });

  it("lets the organizer save teams after the old 18:00 restriction", async () => {
    const teams = ["A", "B", "C", "D", "E", "F"];
    const result = await configureFinalPrediction({
      administrator: user,
      teams,
      now: new Date("2026-08-21T19:00:00Z"),
    });
    expect(mocks.saveTeams).toHaveBeenCalledWith(expect.objectContaining({
      teams,
      now: new Date("2026-08-21T19:00:00Z"),
    }));
    expect(result).toMatchObject({ isOpened: true, notifiedPlayers: 4 });
  });

  it("stores a player's selected team inside the special window", async () => {
    await submitFinalPrediction({
      user,
      position: 4,
      now: new Date("2026-08-21T18:00:00Z"),
    });
    expect(mocks.savePick).toHaveBeenCalledWith(expect.objectContaining({
      playerId: "100",
      position: 4,
      closesAt: new Date("2026-08-22T02:00:00Z"),
    }));
  });

  it("awards ten stars when the organizer records the winner", async () => {
    mocks.recordWinner.mockResolvedValue(7);
    await expect(finishFinalPrediction({
      administrator: user,
      position: 2,
      now: new Date("2026-08-22T03:00:00Z"),
    })).resolves.toBe(7);
    expect(mocks.recordWinner).toHaveBeenCalledWith(expect.objectContaining({
      position: 2,
      rewardStars: 10,
    }));
  });
});
