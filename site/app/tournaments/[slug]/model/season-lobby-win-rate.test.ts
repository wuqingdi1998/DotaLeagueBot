import { describe, expect, it } from "vitest";
import {
  getSeasonLobbyPlayerWinRate,
  getSeasonLobbyTeamWinRate,
} from "./season-lobby-win-rate";

describe("season lobby win-rate hints", () => {
  it("uses an estimated 50 percent before three played rounds", () => {
    expect(
      getSeasonLobbyPlayerWinRate({ playedRounds: 2, winRate: 0.8 }),
    ).toEqual({ estimated: true, label: "~50%", value: 0.5 });
    expect(getSeasonLobbyPlayerWinRate(undefined)).toEqual({
      estimated: true,
      label: "~50%",
      value: 0.5,
    });
  });

  it("shows the real win rate from the third played round", () => {
    expect(
      getSeasonLobbyPlayerWinRate({
        playedRounds: 3,
        winRate: 2 / 3,
      }),
    ).toEqual({ estimated: false, label: "67%", value: 2 / 3 });
    expect(
      getSeasonLobbyPlayerWinRate({ playedRounds: 4, winRate: 0.665 }).label,
    ).toBe("67%");
    expect(
      getSeasonLobbyPlayerWinRate({ playedRounds: 4, winRate: 0.664 }).label,
    ).toBe("66%");
  });

  it("counts estimated players as exactly 50 percent in a full team", () => {
    const standings = new Map([
      ["one", { playedRounds: 3, winRate: 0.6 }],
      ["two", { playedRounds: 5, winRate: 0.7 }],
      ["three", { playedRounds: 3, winRate: 0.4 }],
      ["four", { playedRounds: 2, winRate: 1 }],
    ]);

    const teamWinRate = getSeasonLobbyTeamWinRate(
      ["one", "two", "three", "four", "missing"],
      standings,
    );

    expect(teamWinRate?.label).toBe("54%");
    expect(teamWinRate?.value).toBeCloseTo(0.54);
  });

  it("does not show a misleading average for an incomplete team", () => {
    expect(getSeasonLobbyTeamWinRate(["one", "two"], new Map())).toBeNull();
  });
});
