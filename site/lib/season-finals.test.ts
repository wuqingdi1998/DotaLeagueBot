import { describe, expect, it } from "vitest";
import {
  deriveSeasonFinalMedals,
  groupSeasonFinalMedalists,
  validateSeasonFinalMatch,
} from "./season-finals";

describe("season final medals", () => {
  const finalists = Array.from({ length: 20 }, (_, index) => ({
    playerId: String(index + 1),
  }));
  const matches = [
    {
      status: "completed" as const,
      result: "team_a" as const,
      participants: [
        ...Array.from({ length: 5 }, (_, index) => ({
          playerId: String(index + 1),
          teamSide: "a" as const,
        })),
        ...Array.from({ length: 5 }, (_, index) => ({
          playerId: String(index + 6),
          teamSide: "b" as const,
        })),
      ],
    },
    {
      status: "completed" as const,
      result: "team_b" as const,
      participants: [
        ...Array.from({ length: 5 }, (_, index) => ({
          playerId: String(index + 11),
          teamSide: "a" as const,
        })),
        ...Array.from({ length: 5 }, (_, index) => ({
          playerId: String(index + 16),
          teamSide: "b" as const,
        })),
      ],
    },
  ];

  it("awards ten gold and ten silver medals from two final results", () => {
    const result = deriveSeasonFinalMedals(finalists, matches);

    expect(result.filter((player) => player.medal === "gold")).toHaveLength(10);
    expect(result.filter((player) => player.medal === "silver")).toHaveLength(10);
  });

  it("does not award medals before a final is completed", () => {
    const result = deriveSeasonFinalMedals(finalists, [
      { ...matches[0], status: "published", result: null },
    ]);

    expect(result.every((player) => player.medal === null)).toBe(true);
  });

  it("groups winners before finalists and keeps the lobby order", () => {
    const result = groupSeasonFinalMedalists([
      {
        id: 20,
        lobbyName: "Нижний финал",
        lobbyOrder: 2,
        status: "completed",
        result: "team_b",
        teamAName: "Команда 3",
        teamBName: "Команда 4",
        participants: [
          { playerId: "3", nickname: "Third", teamSide: "a" },
          { playerId: "4", nickname: "Fourth", teamSide: "b" },
        ],
      },
      {
        id: 10,
        lobbyName: "Верхний финал",
        lobbyOrder: 1,
        status: "completed",
        result: "team_a",
        teamAName: "Команда 1",
        teamBName: "Команда 2",
        participants: [
          { playerId: "1", nickname: "First", teamSide: "a" },
          { playerId: "2", nickname: "Second", teamSide: "b" },
        ],
      },
    ]);

    expect(
      result.map(({ medal, teamName, players }) => ({
        medal,
        teamName,
        nicknames: players.map((player) => player.nickname),
      })),
    ).toEqual([
      { medal: "gold", teamName: "Команда 1", nicknames: ["First"] },
      { medal: "gold", teamName: "Команда 4", nicknames: ["Fourth"] },
      { medal: "silver", teamName: "Команда 2", nicknames: ["Second"] },
      { medal: "silver", teamName: "Команда 3", nicknames: ["Third"] },
    ]);
  });
});

describe("season final match validation", () => {
  it("requires two teams of five players and a winner", () => {
    expect(
      validateSeasonFinalMatch({
        roundKind: "finals",
        status: "completed",
        result: "draw",
        teamAPlayerIds: ["1", "2", "3", "4"],
        teamBPlayerIds: ["5", "6", "7", "8", "9"],
      }),
    ).toBe("В финале должно быть по 5 игроков в каждой команде и победитель");
  });

  it("does not impose final rules on a regular round", () => {
    expect(
      validateSeasonFinalMatch({
        roundKind: "regular",
        status: "completed",
        result: "draw",
        teamAPlayerIds: ["1"],
        teamBPlayerIds: ["2"],
      }),
    ).toBe("");
  });
});
