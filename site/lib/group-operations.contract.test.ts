import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const groupOperationsSource = readFileSync(
  new URL(
    "../app/api/admin/groups/group-operations.ts",
    import.meta.url,
  ),
  "utf8",
);
const groupMatchCreationSource = readFileSync(
  new URL(
    "../app/api/admin/groups/group-match-creation.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("group match creation contract", () => {
  it("creates group matches during both formation and shuffle", () => {
    expect(
      groupOperationsSource.match(
        /const groupMatchCount = await createGroupMatches\(/g,
      ),
    ).toHaveLength(2);
  });

  it("stores a placeholder for every unassigned match side", () => {
    expect(groupMatchCreationSource).toContain("team_a_placeholder");
    expect(groupMatchCreationSource).toContain("team_b_placeholder");
    expect(groupMatchCreationSource).toContain("match.teamAPlaceholder");
    expect(groupMatchCreationSource).toContain("match.teamBPlaceholder");
  });

  it("does not treat the retired per-match check-in as a started match", () => {
    expect(groupOperationsSource).not.toContain("tournament_match_checkins");
    expect(groupOperationsSource).toContain("match.status <> 'scheduled'");
    expect(groupOperationsSource).toContain("match.team_a_score IS NOT NULL");
    expect(groupOperationsSource).toContain("match.decision_note IS NOT NULL");
  });
});
