import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { tournamentCompetitionStages } from "./tournament-stages";

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

describe("tournament competition stages", () => {
  it("shows groups and grand final when playoff description is empty", () => {
    expect(
      tournamentCompetitionStages({
        group_format: "Две группы · BO2",
        playoff_format: "   ",
        final_format: "Гранд-финал · BO5",
      }).map((stage) => stage.key),
    ).toEqual(["groups", "final"]);
  });

  it("keeps all three stages when playoff description is filled", () => {
    expect(
      tournamentCompetitionStages({
        group_format: "Две группы · BO2",
        playoff_format: "Плей-офф · BO3",
        final_format: "Гранд-финал · BO5",
      }).map((stage) => stage.key),
    ).toEqual(["groups", "playoffs", "final"]);
  });

  it("uses both full-width columns when only two stages are shown", () => {
    expect(css).toMatch(
      /\.quick-facts-two\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\);/,
    );
  });
});
