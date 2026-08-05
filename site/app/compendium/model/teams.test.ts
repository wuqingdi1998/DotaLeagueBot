import { describe, expect, it } from "vitest";
import {
  compendiumTeamByKey,
  compendiumTeamLogoUrl,
} from "./teams";

describe("compendium team logos", () => {
  it("uses the current TI 2026 logos for renamed teams", () => {
    expect(compendiumTeamByKey("iron-wing")?.liquipediaLogoPath).toBe(
      "/commons/images/thumb/3/3c/Iron_Wing_allmode.png/100px-Iron_Wing_allmode.png",
    );
    expect(compendiumTeamByKey("gamerlegion")?.liquipediaLogoPath).toBe(
      "/commons/images/thumb/2/21/GamerLegion_2026_allmode.png/100px-GamerLegion_2026_allmode.png",
    );
  });

  it("changes the public logo URL when its source image changes", () => {
    expect(compendiumTeamLogoUrl("iron-wing")).toBe(
      "/api/compendium/teams/iron-wing?v=100px-Iron_Wing_allmode.png",
    );
    expect(compendiumTeamLogoUrl("tbd")).toBe("/tbd-team.svg");
  });
});
