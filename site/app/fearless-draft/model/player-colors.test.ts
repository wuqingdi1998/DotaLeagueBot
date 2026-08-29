import { describe, expect, it } from "vitest";
import {
  DRAFT_TEAM_PLAYER_COLORS,
  draftTeamPlayerColor,
} from "./player-colors";

describe("Fearless Draft team player colors", () => {
  it("assigns five stable bright colors from captain to fifth slot", () => {
    expect(DRAFT_TEAM_PLAYER_COLORS).toEqual([
      "#22c7f2",
      "#ff9a4c",
      "#f2d94e",
      "#4bd58a",
      "#c58cff",
    ]);
    expect(draftTeamPlayerColor(1)).toBe("#22c7f2");
    expect(draftTeamPlayerColor(5)).toBe("#c58cff");
  });
});
