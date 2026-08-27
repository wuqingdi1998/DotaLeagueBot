import { describe, expect, it } from "vitest";
import {
  calculateRankedWinSnapshot,
  findRankedWinsWithoutRoles,
  parsePlayerPositions,
  SEASON_PRIMARY_ROLE_WINS_REQUIRED,
  SEASON_SECONDARY_ROLE_WINS_REQUIRED,
  type RankedMatchCandidate,
} from "./model";

const now = new Date("2026-08-27T12:00:00.000Z");

function match(
  matchId: string,
  role: 1 | 2 | 3 | 4 | 5 | null,
  overrides: Partial<RankedMatchCandidate> = {},
): RankedMatchCandidate {
  return {
    matchId,
    role,
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

  it("counts each Stratz match only once", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [match("100", 1), match("100", 1), match("101", 4)],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(1);
    expect(snapshot.secondaryWins).toBe(1);
    expect(snapshot.availableUntil).toBe("2026-08-27T12:05:00.000Z");
  });

  it("keeps a known Stratz role if a duplicate has no role", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [match("100", null), match("100", 1)],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(1);
  });

  it("ignores losses, future matches and matches older than thirty days", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [
        match("loss", 1, { won: false }),
        match("old", 1, {
          startedAt: new Date("2026-07-28T11:59:59.000Z"),
        }),
        match("future", 1, {
          startedAt: new Date("2026-08-27T12:00:01.000Z"),
        }),
      ],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(0);
    expect(snapshot.secondaryWins).toBe(0);
  });

  it("uses an exact rolling thirty-day window, including its first instant", () => {
    const snapshot = calculateRankedWinSnapshot({
      matches: [
        match("boundary", 1, {
          startedAt: new Date("2026-07-28T12:00:00.000Z"),
        }),
        match("one-second-too-old", 1, {
          startedAt: new Date("2026-07-28T11:59:59.000Z"),
        }),
      ],
      now,
      positions: { primaryRole: 1, secondaryRole: 4 },
    });

    expect(snapshot.primaryWins).toBe(1);
  });

  it("finds in-window Stratz wins whose role is unknown", () => {
    expect(
      findRankedWinsWithoutRoles({
        matches: [
          match("known", 3),
          match("unknown", null),
          match("old", null, {
            startedAt: new Date("2026-07-28T11:59:59.000Z"),
          }),
        ],
        now,
      }),
    ).toEqual(["unknown"]);
  });
});
