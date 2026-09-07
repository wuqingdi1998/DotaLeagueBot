import { describe, expect, it } from "vitest";
import {
  automaticCaptainBallots,
  resolveCaptainSelection,
  resolveCaptainTiebreak,
  type CaptainSelectionPlayer,
} from "./captain-selection";

function player(
  playerId: string,
  tier: number | null,
  wantsCaptain: boolean,
): CaptainSelectionPlayer {
  return { playerId, tier, wantsCaptain };
}

describe("season lobby captain selection", () => {
  it("uses the highest tier when nobody wants to be captain", () => {
    const result = resolveCaptainSelection([
      player("1", 7, false),
      player("2", 9, false),
      player("3", 8, false),
    ], [], () => 0);

    expect(result).toEqual({ kind: "captain", captainPlayerId: "2" });
  });

  it("randomly selects among the highest tiers when nobody volunteers", () => {
    const result = resolveCaptainSelection([
      player("1", 9, false),
      player("2", 9, false),
      player("3", 8, false),
    ], [], () => 1);

    expect(result).toEqual({ kind: "captain", captainPlayerId: "2" });
  });

  it("immediately selects the only volunteer", () => {
    const result = resolveCaptainSelection([
      player("1", 4, false),
      player("2", 5, true),
      player("3", 9, false),
    ], [], () => 0);

    expect(result).toEqual({ kind: "captain", captainPlayerId: "2" });
  });

  it("creates one automatic self ballot for every volunteer", () => {
    expect(automaticCaptainBallots([
      player("1", 4, true),
      player("2", 5, false),
      player("3", 9, true),
    ])).toEqual([
      { voterPlayerId: "1", candidatePlayerId: "1", isAutomatic: true },
      { voterPlayerId: "3", candidatePlayerId: "3", isAutomatic: true },
    ]);
  });

  it("starts the special tiebreak for three volunteers and split external votes", () => {
    const players = [
      player("1", 8, true),
      player("2", 7, true),
      player("3", 6, true),
      player("4", 5, false),
      player("5", 4, false),
    ];
    const result = resolveCaptainSelection(players, [
      ...automaticCaptainBallots(players),
      { voterPlayerId: "4", candidatePlayerId: "1", isAutomatic: false },
      { voterPlayerId: "5", candidatePlayerId: "2", isAutomatic: false },
    ], () => 0);

    expect(result).toEqual({
      kind: "tiebreak",
      voterPlayerId: "3",
      candidatePlayerIds: ["1", "2"],
    });
  });

  it("does not start the special tiebreak unless both external ballots exist", () => {
    const players = [
      player("1", 8, true),
      player("2", 7, true),
      player("3", 6, true),
      player("4", 5, false),
      player("5", 4, false),
    ];
    const result = resolveCaptainSelection(players, [
      ...automaticCaptainBallots(players),
      { voterPlayerId: "4", candidatePlayerId: "1", isAutomatic: false },
    ], () => 0);

    expect(result).toEqual({ kind: "captain", captainPlayerId: "1" });
  });

  it("uses votes, then tier, then randomness for an ordinary result", () => {
    const players = [
      player("1", 9, true),
      player("2", 9, true),
      player("3", 6, false),
      player("4", 5, false),
      player("5", 4, false),
    ];
    const ballots = [
      ...automaticCaptainBallots(players),
      { voterPlayerId: "3", candidatePlayerId: "1", isAutomatic: false },
      { voterPlayerId: "4", candidatePlayerId: "2", isAutomatic: false },
    ];

    expect(resolveCaptainSelection(players, ballots, () => 1)).toEqual({
      kind: "captain",
      captainPlayerId: "2",
    });
  });

  it("uses the deciding vote on stage three", () => {
    expect(resolveCaptainTiebreak([
      { playerId: "1", tier: 7 },
      { playerId: "2", tier: 9 },
    ], "1", () => 0)).toBe("1");
  });

  it("uses the higher tier when the deciding player times out", () => {
    expect(resolveCaptainTiebreak([
      { playerId: "1", tier: 9 },
      { playerId: "2", tier: 7 },
    ], null, () => 1)).toBe("1");
  });

  it("uses randomness for equal tiers when the deciding player times out", () => {
    expect(resolveCaptainTiebreak([
      { playerId: "1", tier: 9 },
      { playerId: "2", tier: 9 },
    ], null, () => 1)).toBe("2");
  });
});
