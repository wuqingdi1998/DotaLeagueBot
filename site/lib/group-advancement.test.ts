import { describe, expect, it } from "vitest";
import {
  advancingTeamCount,
  groupOutcome,
  groupOutcomeLabel,
} from "./group-advancement";

const settings = {
  advance_to_playoff: 2,
  advance_to_upper: 1,
  advance_to_lower: 1,
};

describe("group advancement", () => {
  it("separates upper, lower and eliminated teams in Double Elimination", () => {
    expect(groupOutcome(1, settings, "double_elimination")).toBe("upper");
    expect(groupOutcome(2, settings, "double_elimination")).toBe("lower");
    expect(groupOutcome(3, settings, "double_elimination")).toBe(
      "eliminated",
    );
    expect(
      advancingTeamCount(settings, "double_elimination"),
    ).toBe(2);
  });

  it("uses one playoff boundary in Single Elimination", () => {
    expect(groupOutcome(1, settings, "single_elimination")).toBe("playoff");
    expect(groupOutcome(2, settings, "single_elimination")).toBe("playoff");
    expect(groupOutcome(3, settings, "single_elimination")).toBe(
      "eliminated",
    );
    expect(groupOutcomeLabel("eliminated")).toBe("Вылет");
  });
});
