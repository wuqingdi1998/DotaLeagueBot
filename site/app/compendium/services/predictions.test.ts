import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordPredictionPick: vi.fn(),
  recordPredictionResult: vi.fn(),
  replacePredictionMatches: vi.fn(),
}));

vi.mock("./prediction-repository", () => ({
  recordPredictionPick: mocks.recordPredictionPick,
  recordPredictionResult: mocks.recordPredictionResult,
  replacePredictionMatches: mocks.replacePredictionMatches,
}));

import { configurePredictionMatches, finishPredictionMatch } from "./predictions";

const administrator = {
  discordId: "100",
  dotaId: "200",
  username: "organizer",
  avatarUrl: null,
  playerName: "Organizer",
  realName: null,
  positions: null,
  serverName: "Organizer",
  isAdmin: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.replacePredictionMatches.mockResolvedValue(undefined);
  mocks.recordPredictionResult.mockResolvedValue(4);
});

describe("prediction schedule configuration", () => {
  it("accepts two matches for any calendar day and one TBD team", async () => {
    await configurePredictionMatches({
      administrator,
      dateKey: "2026-07-01",
      matches: [
        { teamAKey: "tbd", teamBKey: "team-spirit", startsAt: "2026-07-01T12:00:00+03:00" },
        { teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-07-01T15:00:00+03:00" },
      ],
    });

    expect(mocks.replacePredictionMatches).toHaveBeenCalledWith(expect.objectContaining({
      dateKey: "2026-07-01",
      matches: expect.arrayContaining([
        expect.objectContaining({ teamA: expect.objectContaining({ key: "tbd" }) }),
      ]),
    }));
  });

  it("rejects a day with fewer than two matches or TBD on both sides", async () => {
    await expect(configurePredictionMatches({
      administrator,
      dateKey: "2026-08-10",
      matches: [{ teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-08-10T12:00:00+03:00" }],
    })).rejects.toMatchObject({ code: "PREDICTION_INVALID" });

    await expect(configurePredictionMatches({
      administrator,
      dateKey: "2026-08-10",
      matches: [
        { teamAKey: "tbd", teamBKey: "tbd", startsAt: "2026-08-10T12:00:00+03:00" },
        { teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-08-10T15:00:00+03:00" },
      ],
    })).rejects.toMatchObject({ code: "PREDICTION_INVALID" });
  });

  it("lets the organizer record a result without a schedule-time gate", async () => {
    await expect(finishPredictionMatch({
      administrator,
      matchId: "77",
      score: "2:1",
    })).resolves.toBe(4);
    expect(mocks.recordPredictionResult).toHaveBeenCalledWith({
      administratorId: "100",
      matchId: "77",
      score: "2:1",
    });
  });
});

