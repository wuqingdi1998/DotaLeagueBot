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
    { viewportWidth: 1280, regularWidth: 1244, fullscreenWidth: 1280 },
    { viewportWidth: 1920, regularWidth: 1540, fullscreenWidth: 1920 },
    { viewportWidth: 3440, regularWidth: 1540, fullscreenWidth: 3440 },
  ])(
    "keeps $viewportWidth px desktop layouts inside the centered frame",
    ({ viewportWidth, regularWidth, fullscreenWidth }) => {
      expect(regularWidth).toBeLessThanOrEqual(1540);
      expect(fullscreenWidth).toBe(viewportWidth);
    },
  );

  it("keeps the regular desktop board centered inside the same maximum width", () => {
    expect(boardStyles).toMatch(
      /\.fearless-active-draft\s*\{[^}]*width:\s*min\(1540px, calc\(100% - 36px\)\);[^}]*margin:\s*22px auto 0;/,
    );
    expect(boardStyles).toMatch(
      /\.fearless-hero-grid\s*\{[^}]*align-items:\s*start;[^}]*aspect-ratio:\s*auto;[^}]*height:\s*auto;/,
    );
  });

  it("fills the fullscreen width while keeping the upper board capped and centered", () => {
    expect(fullscreenStyles).toMatch(
      /\.fearless-draft-stage:fullscreen\s*\{[^}]*width:\s*100%;[^}]*margin:\s*0;/,
    );
    expect(fullscreenStyles).toMatch(
      /:fullscreen \.fearless-draft-status,[\s\S]*:fullscreen \.fearless-team-columns\s*\{[^}]*width:\s*min\(1812px, calc\(100% - 18px\)\);[^}]*align-self:\s*center;/,
    );
  });

  it("keeps the fullscreen owner mounted around both draft and choice stages", () => {
    expect(fullscreenStyles).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-active-draft\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*100%;/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-choice-screen\s*\{[^}]*min-height:\s*min\(800px, calc\(100dvh - 48px\)\);/,
    );
  });

  it("scales the side and pick-order controls for fullscreen", () => {
    expect(fullscreenStyles).toMatch(
      /:fullscreen \.fearless-decision-card\s*\{[^}]*width:\s*min\(720px, calc\(100% - 48px\)\);[^}]*max-width:\s*none;[^}]*padding:\s*32px;/,
    );
    expect(fullscreenStyles).toMatch(
      /:fullscreen \.fearless-choice-buttons button\s*\{[^}]*min-height:\s*72px;[^}]*font-size:\s*20px;[^}]*white-space:\s*nowrap;/,
    );
    expect(fullscreenStyles).toMatch(
      /:fullscreen \.fearless-decision-player \.fearless-player-avatar\s*\{[^}]*width:\s*76px;[^}]*height:\s*76px;/,
    );
  });

  it("uses the full fullscreen frame for larger portraits", () => {
    expect(fullscreenStyles).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-hero-pool\s*\{[^}]*--fearless-fullscreen-grid-width:\s*min\(100%, 1540px\);/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-hero-grid\s*\{[^}]*width:\s*var\(--fearless-fullscreen-grid-width\);[^}]*aspect-ratio:\s*auto;[^}]*height:\s*auto;[^}]*flex:\s*0 0 auto;[^}]*align-self:\s*start;[^}]*align-items:\s*start;/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-attribute-group button\s*\{[^}]*width:\s*100%;[^}]*padding:\s*0;/,
    );
    expect(fullscreenStyles).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-hero-image\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*25 \/ 44;/,
    );
  });

  it("fills the right side with history and keeps confirmation inset from the heroes", () => {
    expect(fullscreenStyles).toMatch(
      /:fullscreen \.fearless-draft-workspace\s*\{[^}]*width:\s*100%;[^}]*grid-template-columns:\s*minmax\(0, 1540px\) minmax\(260px, 1fr\);/,
    );
    expect(fullscreenStyles).toMatch(
      /:fullscreen \.fearless-history\s*\{[^}]*display:\s*flex;[^}]*align-self:\s*stretch;/,
    );
    expect(fullscreenStyles).toMatch(
      /:fullscreen \.fearless-hero-confirm,\s*\.fearless-draft-stage\.season-lobby-embedded \.fearless-hero-confirm\s*\{[^}]*aspect-ratio:\s*16 \/ 9;[^}]*min-height:\s*0;/,
    );
    expect(fullscreenStyles).toContain(
      "width: calc(((var(--fearless-fullscreen-grid-width) - 16px - var(--fearless-attribute-gap) - var(--fearless-attribute-gap) - var(--fearless-attribute-gap)) / 4) - 18px)",
    );
    expect(fullscreenStyles).toMatch(
      /@media \(min-width: 1831px\)[\s\S]*:fullscreen \.fearless-draft-workspace\s*\{[^}]*grid-template-columns:\s*calc\(\(100vw - 1830px\) \/ 2\) 1540px minmax\(260px, 1fr\) calc\(\(100vw - 1830px\) \/ 2\);/,
    );
    expect(fullscreenStyles).toMatch(
      /@media \(min-width: 1831px\)[\s\S]*:fullscreen \.fearless-history\s*\{[^}]*grid-column:\s*3;[^}]*margin-left:\s*12px;/,
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
      /\.fearless-draft-stage:fullscreen \.fearless-attribute-group button\s*\{[^}]*width:\s*100%;[^}]*padding:\s*0;/,
    );
  });
});
