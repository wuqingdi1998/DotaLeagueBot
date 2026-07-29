import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const styles = loadSiteStyles();

describe("mobile width safety", () => {
  it("allows the tournament hero grid and its content to shrink", () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*1050px\)[\s\S]*?\.hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    expect(styles).toMatch(
      /\.hero-content,\s*\.hero-poster\s*\{[^}]*min-width:\s*0;/,
    );
  });

  it("wraps long tournament headlines inside the mobile viewport", () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hero h1\s*\{[^}]*max-width:\s*100%;[^}]*overflow-wrap:\s*anywhere;/,
    );
  });

  it("keeps the header brand from sliding under action buttons", () => {
    expect(styles).toMatch(
      /\.brand\s*>\s*span\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.brand strong,\s*\.brand small\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/,
    );
  });

  it("keeps seasonal navigation and match cards inside narrow screens", () => {
    expect(styles).toMatch(
      /\.season-tournament-tabs\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible;/,
    );
    expect(styles).toMatch(
      /\.season-match-card\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.season-match-scoreboard\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
  });

  it("keeps ordinary match cards readable on desktop and mobile", () => {
    expect(styles).toMatch(
      /\.match-row\s*\{[^}]*grid-template-columns:[^;]*minmax\(150px,\s*190px\);[^}]*grid-template-areas:\s*"date stage team-a score team-b format actions";/,
    );
    expect(styles).toMatch(
      /\.checkin-state\s*\{[^}]*line-height:\s*1\.35;[^}]*overflow-wrap:\s*anywhere;[^}]*text-align:\s*right;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.match-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 56px minmax\(0,\s*1fr\);[^}]*grid-template-areas:[^;]*"team-a score team-b";/,
    );
    expect(styles).toMatch(
      /\.match-score\s*\{[^}]*white-space:\s*nowrap;/,
    );
  });
});
