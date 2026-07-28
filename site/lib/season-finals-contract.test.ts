import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const matchActions = readFileSync(
  new URL(
    "../app/api/admin/season/season-match-actions.ts",
    import.meta.url,
  ),
  "utf8",
);
const finalistActions = readFileSync(
  new URL(
    "../app/api/admin/season/season-finalist-actions.ts",
    import.meta.url,
  ),
  "utf8",
);
const roundActions = readFileSync(
  new URL(
    "../app/api/admin/season/season-round-actions.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("two-finals contract", () => {
  it("limits the finals round to two matches", () => {
    expect(matchActions).toContain("match_count >= 2");
    expect(matchActions).toContain("validateSeasonFinalMatch");
  });

  it("limits manual finalists to twenty players", () => {
    expect(finalistActions).toMatch(/COUNT\(\*\)[\s\S]+< 20/);
    expect(finalistActions).toContain("не более 20 игроков");
  });

  it("completes the finals stage only after both matches", () => {
    expect(roundActions).toContain("roundState[0].count !== 2");
  });
});
