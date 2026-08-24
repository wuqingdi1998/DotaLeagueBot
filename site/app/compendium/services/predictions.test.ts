import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deletePredictionDay: vi.fn(),
  deletePredictionMatch: vi.fn(),
  recordPredictionPick: vi.fn(),
  recordPredictionResult: vi.fn(),
  relocatePredictionMatches: vi.fn(),
  replacePredictionMatches: vi.fn(),
}));

vi.mock("./prediction-repository", () => ({
  deletePredictionDay: mocks.deletePredictionDay,
  deletePredictionMatch: mocks.deletePredictionMatch,
  recordPredictionPick: mocks.recordPredictionPick,
  recordPredictionResult: mocks.recordPredictionResult,
  relocatePredictionMatches: mocks.relocatePredictionMatches,
  replacePredictionMatches: mocks.replacePredictionMatches,
}));

import {
  configurePredictionMatches,
  finishPredictionMatch,
  removePredictionSchedule,
} from "./predictions";

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
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
  vi.clearAllMocks();
  mocks.replacePredictionMatches.mockResolvedValue(undefined);
  mocks.relocatePredictionMatches.mockResolvedValue(undefined);
  mocks.recordPredictionResult.mockResolvedValue(4);
  mocks.deletePredictionDay.mockResolvedValue(3);
  mocks.deletePredictionMatch.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("prediction schedule configuration", () => {
  it("accepts two matches for any calendar day and one TBD team", async () => {
    await configurePredictionMatches({
      administrator,
      dateKey: "2026-07-01",
      opensAt: "2026-06-30T18:00:00+03:00",
      matches: [
        { teamAKey: "tbd", teamBKey: "team-spirit", startsAt: "2026-07-01T12:00:00+03:00" },
        { teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-07-01T15:00:00+03:00" },
      ],
    });

    expect(mocks.replacePredictionMatches).toHaveBeenCalledWith(expect.objectContaining({
      dateKey: "2026-07-01",
      opensAt: new Date("2026-06-30T18:00:00+03:00"),
      matches: expect.arrayContaining([
        expect.objectContaining({ teamA: expect.objectContaining({ key: "tbd" }) }),
      ]),
    }));
  });

  it("rejects a day with fewer than two matches or TBD on both sides", async () => {
    await expect(configurePredictionMatches({
      administrator,
      dateKey: "2026-08-10",
      opensAt: "2026-08-09T18:00:00+03:00",
      matches: [{ teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-08-10T12:00:00+03:00" }],
    })).rejects.toMatchObject({ code: "PREDICTION_INVALID" });

    await expect(configurePredictionMatches({
      administrator,
      dateKey: "2026-08-10",
      opensAt: "2026-08-09T18:00:00+03:00",
      matches: [
        { teamAKey: "tbd", teamBKey: "tbd", startsAt: "2026-08-10T12:00:00+03:00" },
        { teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-08-10T15:00:00+03:00" },
      ],
    })).rejects.toMatchObject({ code: "PREDICTION_INVALID" });
  });

  it("rejects an opening moment at or after the first match", async () => {
    await expect(configurePredictionMatches({
      administrator,
      dateKey: "2026-08-10",
      opensAt: "2026-08-10T12:00:00+03:00",
      matches: [
        { teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-08-10T12:00:00+03:00" },
        { teamAKey: "team-spirit", teamBKey: "tbd", startsAt: "2026-08-10T15:00:00+03:00" },
      ],
    })).rejects.toMatchObject({ code: "PREDICTION_INVALID" });
  });

  it("moves a saved day without replacing its matches", async () => {
    await configurePredictionMatches({
      administrator,
      sourceDateKey: "2026-08-14",
      dateKey: "2026-08-13",
      opensAt: "2026-08-12T18:00:00+03:00",
      matches: [
        { teamAKey: "og", teamBKey: "team-liquid", startsAt: "2026-08-13T12:00:00+03:00" },
        { teamAKey: "team-spirit", teamBKey: "tbd", startsAt: "2026-08-13T15:00:00+03:00" },
      ],
    });

    expect(mocks.relocatePredictionMatches).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceDateKey: "2026-08-14",
        dateKey: "2026-08-13",
      }),
    );
    expect(mocks.replacePredictionMatches).not.toHaveBeenCalled();
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

  it("deletes either one match or a complete day", async () => {
    await expect(removePredictionSchedule({ matchId: "77" })).resolves.toEqual({
      deletedMatches: 1,
    });
    expect(mocks.deletePredictionMatch).toHaveBeenCalledWith("77");

    await expect(removePredictionSchedule({ dateKey: "2026-08-10" })).resolves.toEqual({
      deletedMatches: 3,
    });
    expect(mocks.deletePredictionDay).toHaveBeenCalledWith("2026-08-10");
  });
});
