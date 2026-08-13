import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fullscreenStyles = readFileSync(
  resolve(process.cwd(), "app/styles/51-fearless-draft-interactions.css"),
  "utf8",
);
const boardStyles = readFileSync(
  resolve(process.cwd(), "app/styles/51-fearless-draft-board.css"),
  "utf8",
);

describe("Fearless Draft fullscreen layout", () => {
  it.each([
    { viewportWidth: 1280, regularWidth: 1244, fullscreenWidth: 1262 },
    { viewportWidth: 1920, regularWidth: 1540, fullscreenWidth: 1540 },
    { viewportWidth: 3440, regularWidth: 1540, fullscreenWidth: 1540 },
  ])(
    "keeps $viewportWidth px desktop layouts inside the centered frame",
    ({ regularWidth, fullscreenWidth }) => {
      expect(regularWidth).toBeLessThanOrEqual(1540);
      expect(fullscreenWidth).toBeLessThanOrEqual(1540);
    },
  );

  it("keeps the regular desktop board centered inside the same maximum width", () => {
    expect(boardStyles).toMatch(
      /\.fearless-active-draft\s*\{[^}]*width:\s*min\(1540px, calc\(100% - 36px\)\);[^}]*margin:\s*22px auto 0;/,
    );
    expect(boardStyles).toMatch(
      /\.fearless-hero-grid\s*\{[^}]*align-items:\s*start;[^}]*aspect-ratio:\s*9 \/ 4;[^}]*height:\s*auto;/,
    );
  });

  it("centers the same board width on regular and ultrawide screens", () => {
    expect(fullscreenStyles).toMatch(
      /\.fearless-active-draft:fullscreen\s*\{[^}]*width:\s*min\(1540px, calc\(100% - 18px\)\);[^}]*margin:\s*0 auto;/,
    );
  });

  it("uses the full fullscreen frame for larger portraits", () => {
    expect(fullscreenStyles).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-hero-pool\s*\{[^}]*--fearless-fullscreen-grid-width:\s*min\(100%, 1540px\);/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-hero-grid\s*\{[^}]*width:\s*var\(--fearless-fullscreen-grid-width\);[^}]*aspect-ratio:\s*auto;[^}]*height:\s*auto;[^}]*flex:\s*0 0 auto;[^}]*align-self:\s*center;[^}]*align-items:\s*start;/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-attribute-group button\s*\{[^}]*width:\s*100%;[^}]*padding:\s*0;/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-hero-image\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*25 \/ 44;/,
    );
  });

  it("does not let portrait corner styling change desktop frame geometry", () => {
    expect(boardStyles).toMatch(
      /\.fearless-attribute-group button\s*\{[^}]*min-width:\s*0;[^}]*border:\s*1px solid transparent;[^}]*padding:\s*0;/,
    );
    expect(boardStyles).toMatch(
      /\.fearless-hero-image\s*\{[^}]*aspect-ratio:\s*25 \/ 44;[^}]*overflow:\s*hidden;/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-attribute-group button\s*\{[^}]*width:\s*100%;[^}]*padding:\s*0;/,
    );
  });
});
