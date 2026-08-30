import { describe, expect, it } from "vitest";
import { publishedLobbyResultValues } from "./published-result";

describe("published season lobby result", () => {
  it("accepts two map winners that match the entered score", () => {
    expect(
      publishedLobbyResultValues({
        teamAScore: "1",
        teamBScore: "1",
        games: [
          { dotaMatchId: "100", winnerSide: "a" },
          { dotaMatchId: "101", winnerSide: "b" },
        ],
      }),
    ).toMatchObject({
      teamAScore: 1,
      teamBScore: 1,
      calculated: { result: "draw" },
    });
  });

  it("rejects a score that conflicts with map winners", () => {
    expect(() =>
      publishedLobbyResultValues({
        teamAScore: "2",
        teamBScore: "0",
        games: [
          { dotaMatchId: "100", winnerSide: "a" },
          { dotaMatchId: "101", winnerSide: "b" },
        ],
      }),
    ).toThrow("Счёт не совпадает с победителями двух карт");
  });
});
