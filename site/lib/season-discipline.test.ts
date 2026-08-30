import { describe, expect, it } from "vitest";
import { calculateSeasonPenalty } from "./season-discipline";
import {
  calculateSeasonStandings,
  type SeasonStandingMatch,
} from "./season";

describe("season penalty fires", () => {
  it("moves each completed five-fire limit to the next stage", () => {
    expect(
      calculateSeasonPenalty(
        [{ roundNumber: 1, fires: 8 }],
        [1, 2, 3, 4],
      ),
    ).toMatchObject({
      totalFires: 8,
      strikes: 1,
      remainder: 3,
      stages: [5, 3, null, null],
      suspendedRoundNumbers: [2],
      pointAdjustment: -1,
      isExcluded: false,
    });
  });

  it("excludes a player after four completed limits", () => {
    expect(
      calculateSeasonPenalty(
        [
          { roundNumber: 1, fires: 5 },
          { roundNumber: 2, fires: 5 },
          { roundNumber: 3, fires: 5 },
          { roundNumber: 4, fires: 5 },
        ],
        [1, 2, 3, 4, 5],
      ),
    ).toMatchObject({
      strikes: 4,
      stages: [5, 5, 5, 5],
      pointAdjustment: -4,
      isExcluded: true,
    });
  });

  it("suspends two following rounds when ten fires arrive at once", () => {
    expect(
      calculateSeasonPenalty(
        [{ roundNumber: 2, fires: 10 }],
        [1, 2, 3, 4, 5],
      ).suspendedRoundNumbers,
    ).toEqual([3, 4]);
  });
});

describe("season substitutions and p adjustments", () => {
  const match: SeasonStandingMatch = {
    id: 10,
    roundId: 1,
    status: "completed",
    result: "team_a",
    teamAScore: 2,
    teamBScore: 0,
    games: [
      { gameNumber: 1, winnerSide: "a" },
      { gameNumber: 2, winnerSide: "a" },
    ],
    participants: [
      {
        playerId: "1",
        dotaId: "101",
        nickname: "Основной",
        avatarUrl: null,
        teamSide: "a",
      },
      {
        playerId: "2",
        dotaId: "102",
        nickname: "Соперник",
        avatarUrl: null,
        teamSide: "b",
      },
    ],
  };

  it("gives the outgoing player a technical loss and the winner substitute +1 p", () => {
    const rows = calculateSeasonStandings(
      [{ id: 1, roundNumber: 1, isVisible: true }],
      [match],
      [],
      {
        substitutions: [
          {
            matchId: 10,
            outgoingPlayerId: "1",
            incomingPlayerId: "3",
            incomingDotaId: "103",
            incomingNickname: "Замена",
            incomingAvatarUrl: null,
            teamSide: "a",
            technicalLoss: true,
            gameNumber: 2,
          },
        ],
      },
    );

    expect(rows.find((row) => row.playerId === "1")).toMatchObject({
      losses: 1,
      points: 0,
    });
    expect(rows.find((row) => row.playerId === "3")).toMatchObject({
      adjustmentPoints: 1,
      hasAdjustments: true,
      points: 1,
    });
  });

  it("rewards a second-map substitute only for winning that map", () => {
    const rows = calculateSeasonStandings(
      [{ id: 1, roundNumber: 1, isVisible: true }],
      [{
        ...match,
        result: "draw",
        teamAScore: 1,
        teamBScore: 1,
        games: [
          { gameNumber: 1, winnerSide: "a" },
          { gameNumber: 2, winnerSide: "b" },
        ],
      }],
      [],
      {
        substitutions: [{
          matchId: 10,
          outgoingPlayerId: "1",
          incomingPlayerId: "3",
          incomingDotaId: "103",
          incomingNickname: "Замена",
          incomingAvatarUrl: null,
          teamSide: "a",
          technicalLoss: true,
          gameNumber: 2,
        }],
      },
    );

    expect(rows.find((row) => row.playerId === "3")).toMatchObject({
      adjustmentPoints: 0,
      points: 0,
    });
  });

  it("treats a replacement before game one as a full participant", () => {
    const rows = calculateSeasonStandings(
      [{ id: 1, roundNumber: 1, isVisible: true }],
      [match],
      [],
      {
        substitutions: [{
          matchId: 10,
          outgoingPlayerId: "1",
          incomingPlayerId: "3",
          incomingDotaId: "103",
          incomingNickname: "Новый игрок",
          incomingAvatarUrl: null,
          teamSide: "a",
          technicalLoss: false,
          gameNumber: null,
        }],
      },
    );

    expect(rows.find((row) => row.playerId === "1")).toBeUndefined();
    expect(rows.find((row) => row.playerId === "3")).toMatchObject({
      wins: 1,
      adjustmentPoints: 0,
      points: 2,
    });
  });

  it("keeps p blank when no adjustment exists and applies manual changes", () => {
    const rows = calculateSeasonStandings(
      [{ id: 1, roundNumber: 1, isVisible: true }],
      [match],
      [],
      { adjustments: [{ playerId: "2", amount: -1 }] },
    );

    expect(rows.find((row) => row.playerId === "1")?.hasAdjustments).toBe(false);
    expect(rows.find((row) => row.playerId === "2")).toMatchObject({
      adjustmentPoints: -1,
      hasAdjustments: true,
      points: -1,
    });
  });

  it("awards only one substitute bonus per player and match", () => {
    const substitution = {
      matchId: 10,
      outgoingPlayerId: "1",
      incomingPlayerId: "3",
      incomingDotaId: "103",
      incomingNickname: "Замена",
      incomingAvatarUrl: null,
      teamSide: "a" as const,
      technicalLoss: true,
      gameNumber: 2,
    };
    const rows = calculateSeasonStandings(
      [{ id: 1, roundNumber: 1, isVisible: true }],
      [match],
      [],
      { substitutions: [substitution, substitution] },
    );

    expect(rows.find((row) => row.playerId === "3")).toMatchObject({
      adjustmentPoints: 1,
      points: 1,
    });
  });
});
