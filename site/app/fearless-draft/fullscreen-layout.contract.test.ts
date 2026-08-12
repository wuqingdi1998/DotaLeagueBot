import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fullscreenStyles = readFileSync(
  resolve(process.cwd(), "app/styles/51-fearless-draft-interactions.css"),
  "utf8",
);

describe("Fearless Draft fullscreen layout", () => {
  it("removes the regular hero grid aspect ratio before flex sizing", () => {
    expect(fullscreenStyles).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-hero-grid\s*\{[^}]*aspect-ratio:\s*auto;[^}]*height:\s*auto;[^}]*flex:\s*1;/,
    );
  });
});
