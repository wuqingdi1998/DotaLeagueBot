import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const style = (name: string) =>
  readFileSync(new URL(`../app/styles/${name}`, import.meta.url), "utf8");

describe("ultrawide layout limits", () => {
  it("defines shared maximum widths for readable page content", () => {
    expect(style("01-foundation.css")).toMatch(
      /--site-content-max:\s*1540px;[\s\S]*--site-padded-content-max:\s*1760px;/,
    );
  });

  it("limits the home hero, purpose cards, and tournament directory", () => {
    const home = style("10-community-home.css");

    expect(home).toMatch(
      /\.platform-hero\s*\{[^}]*grid-template-columns:\s*minmax\(0, 900px\) minmax\(360px, 600px\);[^}]*justify-content:\s*center;/,
    );
    expect(home).toMatch(
      /\.purpose-grid\s*\{[^}]*max-width:\s*var\(--site-content-max\);/,
    );
    expect(home).toMatch(
      /\.tournament-directory-grid\s*\{[^}]*max-width:\s*var\(--site-content-max\);/,
    );
  });

  it("limits wide tables while the public profile fills its page", () => {
    expect(style("19-hall-of-fame.css")).toMatch(
      /\.hall-content\s*\{[^}]*max-width:\s*var\(--site-padded-content-max\);/,
    );

    const profile = style("12-player-profile.css");
    for (const selector of [
      "player-profile-identity",
      "profile-stat-grid",
      "player-profile-content",
    ]) {
      const block = profile.match(new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`))?.[0];

      expect(block).toBeDefined();
      expect(block).not.toMatch(/max-width:|margin-inline:\s*auto/);
    }
    expect(profile).toMatch(/\.profile-stat-grid\s*\{[^}]*width:\s*100%;/);
  });

  it("limits archive and compendium columns", () => {
    expect(style("28-participants.css")).toMatch(
      /\.archive-player-content\s*\{[^}]*max-width:\s*var\(--site-padded-content-max\);/,
    );
    expect(style("33-compendium.css")).toMatch(
      /\.compendium-hero-section\s*\{[^}]*grid-template-columns:\s*minmax\(0, 900px\) minmax\(390px, 560px\);[^}]*justify-content:\s*center;/,
    );
  });
});
