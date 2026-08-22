import { describe, expect, it } from "vitest";
import { buildPredictionHistory, predictionPickState } from "./prediction-history";

describe("predictionPickState", () => {
  it("keeps an unanswered prediction neutral before the result", () => {
    expect(predictionPickState("2:1", null)).toBe("pending");
  });

  it("marks an exact score as correct", () => {
    expect(predictionPickState("2:1", "2:1")).toBe("exact");
  });

  it("marks the right winner with a different score as a right outcome", () => {
    expect(predictionPickState("2:0", "2:1")).toBe("outcome");
  });

  it("marks a wrong winner as incorrect", () => {
    expect(predictionPickState("1:2", "2:0")).toBe("incorrect");
  });

  it("recognizes the winner in a best-of-five score", () => {
    expect(predictionPickState("3:0", "3:2")).toBe("outcome");
    expect(predictionPickState("2:3", "3:2")).toBe("incorrect");
  });

  it("does not color a missing pick", () => {
    expect(predictionPickState(null, "2:0")).toBe("missing");
  });
});

describe("buildPredictionHistory", () => {
  it("keeps newest source day first and groups player picks", () => {
    const days = buildPredictionHistory(
      [
        { id: "2", dateKey: "2026-08-12", position: 1, teamAName: "A", teamBName: "B", scoreOptions: ["2:0", "2:1", "1:2", "0:2"], actualScore: "2:0" },
        { id: "1", dateKey: "2026-08-11", position: 1, teamAName: "C", teamBName: "D", scoreOptions: ["2:0", "2:1", "1:2", "0:2"], actualScore: null },
      ],
      [
        { dateKey: "2026-08-12", matchId: "2", playerId: "7", dotaId: "70", playerName: "Player", predictedScore: "2:1", rewardStars: 1 },
      ],
    );

    expect(days.map((day) => day.dateKey)).toEqual(["2026-08-12", "2026-08-11"]);
    expect(days[0].players[0]).toMatchObject({
      playerName: "Player",
      earnedStars: 1,
      picks: [{ matchId: "2", predictedScore: "2:1", rewardStars: 1 }],
    });
    expect(days[1].players).toEqual([]);
  });

  it("shows zero earned stars after a result even without a reward row", () => {
    const days = buildPredictionHistory(
      [{ id: "1", dateKey: "2026-08-12", position: 1, teamAName: "A", teamBName: "B", scoreOptions: ["2:0", "2:1", "1:2", "0:2"], actualScore: "2:0" }],
      [{ dateKey: "2026-08-12", matchId: "1", playerId: "7", dotaId: "70", playerName: "Player", predictedScore: "0:2", rewardStars: null }],
    );

    expect(days[0].players[0].earnedStars).toBe(0);
  });
});
