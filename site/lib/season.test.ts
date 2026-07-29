import { describe, expect, it } from "vitest";
import {
  calculateSeasonStandings,
  isValidSeasonTierSnapshot,
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
    teamAScore: 2,
    teamBScore: 0,
    participants: [
      { playerId: "100", dotaId: "1000", nickname: "Alpha", avatarUrl: null, teamSide: "a" },
      { playerId: "200", dotaId: "2000", nickname: "Bravo", avatarUrl: null, teamSide: "b" },
    ],
  },
  {
    id: 12,
    roundId: 2,
    status: "completed",
    result: "team_a",
    teamAScore: 2,
    teamBScore: 0,
    participants: [
      { playerId: "200", dotaId: "2000", nickname: "Bravo", avatarUrl: null, teamSide: "a" },
      { playerId: "100", dotaId: "1000", nickname: "Alpha", avatarUrl: null, teamSide: "b" },
    ],
  },
  {
    id: 13,
    roundId: 3,
    status: "published",
    result: "draw",
    teamAScore: 1,
    teamBScore: 1,
    participants: [
      { playerId: "100", dotaId: "1000", nickname: "Alpha", avatarUrl: null, teamSide: "a" },
      { playerId: "200", dotaId: "2000", nickname: "Bravo", avatarUrl: null, teamSide: "b" },
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
      dotaId: "1000",
      playedRounds: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      mapWins: 3,
      mapLosses: 1,
      winRate: 0.75,
      points: 3,
    });
    expect(standings[1]).toMatchObject({
      playerId: "200",
      dotaId: "2000",
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

  it("sorts equal points by map win rate and then games played", () => {
    const tiedMatches: SeasonStandingMatch[] = [
      {
        id: 21,
        roundId: 1,
        status: "completed",
        result: "team_a",
        teamAScore: 2,
        teamBScore: 1,
        participants: [
          {
            playerId: "100",
            dotaId: "1000",
            nickname: "Alpha",
            avatarUrl: null,
            teamSide: "a",
          },
          {
            playerId: "200",
            dotaId: "2000",
            nickname: "Bravo",
            avatarUrl: null,
            teamSide: "b",
          },
        ],
      },
      {
        id: 22,
        roundId: 3,
        status: "completed",
        result: "team_a",
        teamAScore: 2,
        teamBScore: 0,
        participants: [
          {
            playerId: "300",
            dotaId: "3000",
            nickname: "Charlie",
            avatarUrl: null,
            teamSide: "a",
          },
          {
            playerId: "400",
            dotaId: "4000",
            nickname: "Delta",
            avatarUrl: null,
            teamSide: "b",
          },
        ],
      },
    ];

    const standings = calculateSeasonStandings(rounds, tiedMatches, [], {
      adjustments: [
        { playerId: "100", amount: -1 },
        { playerId: "300", amount: -1 },
      ],
    });

    expect(standings.slice(0, 2).map((row) => row.nickname)).toEqual([
      "Charlie",
      "Alpha",
    ]);
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
  it("accepts only whole historical tiers from 0 to 20", () => {
    expect(isValidSeasonTierSnapshot(0)).toBe(true);
    expect(isValidSeasonTierSnapshot("10")).toBe(true);
    expect(isValidSeasonTierSnapshot(20)).toBe(true);
    expect(isValidSeasonTierSnapshot(-1)).toBe(false);
    expect(isValidSeasonTierSnapshot(1.5)).toBe(false);
    expect(isValidSeasonTierSnapshot(21)).toBe(false);
  });

  it("limits each temporary team to five players", () => {
    expect(
      validateSeasonTeams(["1", "2", "3", "4", "5", "6"], []),
    ).toBe("В каждой команде может быть не более 5 игроков");
  });

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
