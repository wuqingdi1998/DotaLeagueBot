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
});
