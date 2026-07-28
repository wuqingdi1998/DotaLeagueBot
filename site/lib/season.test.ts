import { describe, expect, it } from "vitest";
import {
  calculateSeasonStandings,
  seasonMatchLinks,
  validateSeasonResult,
  validateSeasonTeams,
  visibleSeasonRounds,
  type SeasonStandingMatch,
} from "./season";

const rounds = [
  { id: 1, roundNumber: 1, isVisible: true },
  { id: 2, roundNumber: 2, isVisible: false },
  { id: 3, roundNumber: 3, isVisible: true },
];

const matches: SeasonStandingMatch[] = [
  {
    id: 11,
    roundId: 1,
    status: "completed",
    result: "team_a",
    participants: [
      { playerId: "100", nickname: "Alpha", avatarUrl: null, teamSide: "a" },
      { playerId: "200", nickname: "Bravo", avatarUrl: null, teamSide: "b" },
    ],
  },
  {
    id: 12,
    roundId: 2,
    status: "completed",
    result: "team_a",
    participants: [
      { playerId: "200", nickname: "Bravo", avatarUrl: null, teamSide: "a" },
      { playerId: "100", nickname: "Alpha", avatarUrl: null, teamSide: "b" },
    ],
  },
  {
    id: 13,
    roundId: 3,
    status: "published",
    result: "draw",
    participants: [
      { playerId: "100", nickname: "Alpha", avatarUrl: null, teamSide: "a" },
      { playerId: "200", nickname: "Bravo", avatarUrl: null, teamSide: "b" },
    ],
  },
];

describe("season standings", () => {
  it("counts only visible rounds in the public table", () => {
    const standings = calculateSeasonStandings(
      visibleSeasonRounds(rounds, false),
      matches,
    );

    expect(standings[0]).toMatchObject({
      playerId: "100",
      playedRounds: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      points: 3,
    });
    expect(standings[1]).toMatchObject({
      playerId: "200",
      playedRounds: 2,
      wins: 0,
      draws: 1,
      losses: 1,
      points: 1,
    });
    expect(standings[0].rounds).not.toHaveProperty("2");
  });

  it("can calculate an organizer preview including hidden rounds", () => {
    const standings = calculateSeasonStandings(
      visibleSeasonRounds(rounds, true),
      matches,
    );

    expect(standings.find((row) => row.playerId === "200")).toMatchObject({
      wins: 1,
      draws: 1,
      losses: 1,
      points: 3,
    });
  });

  it("does not award points for an unresolved result", () => {
    const standings = calculateSeasonStandings(rounds.slice(0, 1), [
      { ...matches[0], result: null },
    ]);

    expect(standings[0]).toMatchObject({
      playedRounds: 0,
      points: 0,
    });
    expect(standings[0].rounds["1"].outcome).toBe("pending");
  });
});

describe("season match safety", () => {
  it("rejects a player selected for both temporary teams", () => {
    expect(validateSeasonTeams(["100", "200"], ["200", "300"])).toBe(
      "Один игрок не может находиться в обеих командах",
    );
  });

  it("rejects a result that contradicts the score", () => {
    expect(validateSeasonResult("team_a", 0, 2)).toBe(
      "При победе команды A её счёт должен быть больше",
    );
    expect(validateSeasonResult("draw", 1, 2)).toBe(
      "Для ничьей счёт команд должен совпадать",
    );
    expect(validateSeasonResult("team_b", 0, 2)).toBe("");
  });

  it("builds external match links without storing them", () => {
    expect(seasonMatchLinks("7890123456")).toEqual({
      dotaBuff: "https://www.dotabuff.com/matches/7890123456",
      stratz: "https://stratz.com/matches/7890123456",
    });
    expect(seasonMatchLinks("")).toBeNull();
  });
});
