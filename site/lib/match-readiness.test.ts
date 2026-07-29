import { describe, expect, it } from "vitest";
import { shouldShowMatchReadiness } from "../app/tournaments/[slug]/model/match-readiness";

describe("ordinary match readiness", () => {
  it("does not show readiness while both teams are TBA", () => {
    expect(
      shouldShowMatchReadiness(
        {
          team_a_application_id: null,
          team_b_application_id: null,
        },
        false,
      ),
    ).toBe(false);
  });

  it("does not show readiness while one team is still TBA", () => {
    expect(
      shouldShowMatchReadiness(
        {
          team_a_application_id: 12,
          team_b_application_id: null,
        },
        false,
      ),
    ).toBe(false);
  });

  it("shows readiness when both real teams are assigned", () => {
    expect(
      shouldShowMatchReadiness(
        {
          team_a_application_id: 12,
          team_b_application_id: 24,
        },
        false,
      ),
    ).toBe(true);
  });

  it("does not show readiness in an archived tournament", () => {
    expect(
      shouldShowMatchReadiness(
        {
          team_a_application_id: 12,
          team_b_application_id: 24,
        },
        true,
      ),
    ).toBe(false);
  });
});
