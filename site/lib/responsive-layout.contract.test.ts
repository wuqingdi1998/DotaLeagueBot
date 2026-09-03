import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const directoryStyles = readFileSync(
  new URL("../app/styles/11-tournament-directory.css", import.meta.url),
  "utf8",
);
const standingsStyles = readFileSync(
  new URL(
    "../app/styles/06-tournament-standings-responsive.css",
    import.meta.url,
  ),
  "utf8",
);
const profileStyles = readFileSync(
  new URL("../app/styles/12-player-profile-responsive.css", import.meta.url),
  "utf8",
);

describe("responsive tournament layouts", () => {
  it("keeps all directory filters visible on compact phones", () => {
    expect(directoryStyles).toMatch(
      /@media \(max-width: 420px\)[\s\S]*\.directory-filters\s*\{[\s\S]*overflow-x:\s*hidden/,
    );
    expect(directoryStyles).toMatch(
      /@media \(max-width: 420px\)[\s\S]*\.directory-filters button\s*\{[\s\S]*padding:\s*0 8px/,
    );
  });

  it("stacks group standings before a large tablet becomes too narrow", () => {
    expect(standingsStyles).toMatch(
      /@media \(max-width: 820px\)[\s\S]*\.standings-groups\s*\{[^}]*grid-template-columns:\s*1fr;/,
    );
  });

  it("reserves useful space for team names on compact phones", () => {
    expect(standingsStyles).toMatch(
      /@media \(max-width: 370px\)[\s\S]*\.standing-row\s*\{[^}]*grid-template-columns:\s*28px minmax\(0, 1fr\) 44px 68px;/,
    );
    expect(standingsStyles).toMatch(
      /@media \(max-width: 370px\)[\s\S]*\.standing-group \.standing-row\s*\{[^}]*grid-template-columns:\s*26px minmax\(0, 1fr\) 36px 36px 64px;/,
    );
  });

  it("gives a compact profile nickname its own full row", () => {
    expect(profileStyles).toMatch(
      /@media \(max-width: 370px\)[\s\S]*\.public-profile-nickname-line\s*\{[^}]*flex-wrap:\s*wrap;/,
    );
    expect(profileStyles).toMatch(
      /@media \(max-width: 370px\)[\s\S]*\.public-profile-name-row h1\s*\{[^}]*flex-basis:\s*100%;/,
    );
  });

  it("uses three result columns on phones and foldable screens", () => {
    expect(profileStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.profile-stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/,
    );
    expect(profileStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.profile-stat-grid span\s*\{[^}]*white-space:\s*nowrap;/,
    );
    expect(profileStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.profile-stat-grid span\s*\{[^}]*font-size:\s*clamp\(9px, 2\.45vw, 11px\);/,
    );
  });

  it("falls back to two result columns only on truly compact screens", () => {
    expect(profileStyles).toMatch(
      /@media \(max-width: 359px\)[\s\S]*\.profile-stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });
});
