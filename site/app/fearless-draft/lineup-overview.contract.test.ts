import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(
  process.cwd(),
  "app/fearless-draft/sections/DraftLineupAssignment.tsx",
), "utf8");

describe("Fearless Draft lineup presentation", () => {
  it("shows raw picks only until both captains reveal the assignments", () => {
    expect(source).toMatch(
      /!lineup\?\.isRevealed && \(\s*<div className="fearless-lineup-picks-overview">/,
    );
    expect(source).toMatch(
      /lineup\?\.isRevealed \? \(\s*<div className="fearless-lineup-results">/,
    );
  });
});
