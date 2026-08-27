import { describe, expect, it } from "vitest";
import {
  calculateRankedWinSnapshot,
  parsePlayerPositions,
  SEASON_PRIMARY_ROLE_WINS_REQUIRED,
  SEASON_SECONDARY_ROLE_WINS_REQUIRED,
  type RankedMatchCandidate,
} from "./model";

const now = new Date("2026-08-27T12:00:00.000Z");

function match(
  matchId: string,
  role: 1 | 2 | 3 | 4 | 5 | null,
  source: "opendota" | "dotabuff",
  overrides: Partial<RankedMatchCandidate> = {},
): RankedMatchCandidate {
  return {
    matchId,
    role,
    roleConfidence: source === "dotabuff" ? 2 : 1,
    source,
    startedAt: new Date("2026-08-20T12:00:00.000Z"),
    won: true,
    ...overrides,
  };
}

describe("season ranked wins", () => {
  it("uses ten primary and four secondary role wins", () => {
    expect(SEASON_PRIMARY_ROLE_WINS_REQUIRED).toBe(10);
    expect(SEASON_SECONDARY_ROLE_WINS_REQUIRED).toBe(4);
  });

  it("reads the primary and secondary positions from the player profile", () => {
    expect(parsePlayerPositions("1/4")).toEqual({
      primaryRole: 1,
      secondaryRole: 4,
    });
    expect(parsePlayerPositions("1")).toBeNull();
    expect(parsePlayerPositions("1/8")).toBeNull();
  });

  it("deduplicates the same match returned by both platforms", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [
        match("100", 1, "opendota"),
        match("100", 1, "dotabuff"),
        match("101", 4, "opendota"),
      ],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(1);
    expect(snapshot.secondaryWins).toBe(1);
    expect(snapshot.availableUntil).toBe("2026-08-27T12:05:00.000Z");
  });

  it("uses the more reliable role when platforms disagree", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [match("100", 1, "opendota"), match("100", 4, "dotabuff")],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(0);
    expect(snapshot.secondaryWins).toBe(1);
  });

  it("keeps a known role when the other platform has no role", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [match("100", 1, "opendota"), match("100", null, "dotabuff")],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(1);
  });

  it("ignores losses, future matches and matches older than thirty days", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [
        match("loss", 1, "opendota", { won: false }),
        match("old", 1, "opendota", {
          startedAt: new Date("2026-07-28T11:59:59.000Z"),
        }),
        match("future", 1, "opendota", {
          startedAt: new Date("2026-08-27T12:00:01.000Z"),
        }),
      ],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(0);
    expect(snapshot.secondaryWins).toBe(0);
  });
});
