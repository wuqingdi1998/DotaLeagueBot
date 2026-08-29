import { describe, expect, it } from "vitest";
import {
  DRAFT_TEAM_PLAYER_COLORS,
  draftTeamPlayerColor,
} from "./player-colors";

describe("Fearless Draft team player colors", () => {
  it("assigns five stable pastel colors from captain to fifth slot", () => {
    expect(DRAFT_TEAM_PLAYER_COLORS).toEqual([
      "#71c4dc",
      "#dfa171",
      "#d8c76f",
      "#79bd96",
      "#aa91c7",
    ]);
    expect(draftTeamPlayerColor(1)).toBe("#71c4dc");
    expect(draftTeamPlayerColor(5)).toBe("#aa91c7");
  });
});
