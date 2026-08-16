import { beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.clearAllMocks();
    mocks.load.mockResolvedValue({ teams: [], selectedPosition: null, winnerPosition: null });
  });

  it("requires six distinct team names", async () => {
    await expect(configureFinalPrediction({ administrator: user, teams: ["A", "A", "B", "C", "D", "E"] }))
      .rejects.toMatchObject({ code: "PREDICTION_INVALID" });
    expect(mocks.saveTeams).not.toHaveBeenCalled();
  });

  it("saves six teams before the prediction opens", async () => {
    const teams = ["A", "B", "C", "D", "E", "F"];
    await configureFinalPrediction({
      administrator: user,
      teams,
      now: new Date("2026-08-20T14:00:00Z"),
    });
    expect(mocks.saveTeams).toHaveBeenCalledWith(expect.objectContaining({
      teams,
      opensAt: new Date("2026-08-20T15:00:00Z"),
    }));
  });

  it("stores a player's selected team inside the special window", async () => {
    await submitFinalPrediction({
      user,
      position: 4,
      now: new Date("2026-08-20T18:00:00Z"),
    });
    expect(mocks.savePick).toHaveBeenCalledWith(expect.objectContaining({
      playerId: "100",
      position: 4,
      closesAt: new Date("2026-08-21T02:00:00Z"),
    }));
  });

  it("awards ten stars when the organizer records the winner", async () => {
    mocks.recordWinner.mockResolvedValue(7);
    await expect(finishFinalPrediction({
      administrator: user,
      position: 2,
      now: new Date("2026-08-21T03:00:00Z"),
    })).resolves.toBe(7);
    expect(mocks.recordWinner).toHaveBeenCalledWith(expect.objectContaining({
      position: 2,
      rewardStars: 10,
    }));
  });
});
