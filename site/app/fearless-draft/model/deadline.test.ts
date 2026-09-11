import { describe, expect, it } from "vitest";
import { draftTurnDeadline } from "./deadline";

const startedAt = new Date("2026-09-11T10:00:00.000Z");

describe("draftTurnDeadline", () => {
  it("uses the first actor base time and reserve", () => {
    const deadline = draftTurnDeadline({
      player1Id: "1",
      player2Id: "2",
      firstPickPlayerId: "1",
      currentStep: 0,
      stepStartedAt: startedAt,
      player1ReserveSeconds: 130,
      player2ReserveSeconds: 90,
    });
    expect(deadline?.toISOString()).toBe("2026-09-11T10:02:25.000Z");
  });

  it("uses the second actor reserve on their step", () => {
    const deadline = draftTurnDeadline({
      player1Id: "1",
      player2Id: "2",
      firstPickPlayerId: "1",
      currentStep: 2,
      stepStartedAt: startedAt,
      player1ReserveSeconds: 130,
      player2ReserveSeconds: 90,
    });
    expect(deadline?.toISOString()).toBe("2026-09-11T10:01:45.000Z");
  });

  it("has no deadline after the final draft step", () => {
    expect(draftTurnDeadline({
      player1Id: "1",
      player2Id: "2",
      firstPickPlayerId: "1",
      currentStep: 999,
      stepStartedAt: startedAt,
      player1ReserveSeconds: 0,
      player2ReserveSeconds: 0,
    })).toBeNull();
  });
});
