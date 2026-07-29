import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const css = loadSiteStyles();

describe("mobile tournament navigation", () => {
  it("allows horizontal scrolling without a vertical scrollbar", () => {
    expect(css).toMatch(
      /\.tabs\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/,
    );
    expect(css).toMatch(
      /\.tournament-tabs-main,\s*\.tournament-tabs-stages\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/,
    );
  });
});

describe("mobile tournament directory", () => {
  it("keeps tournament cards inside the available screen width", () => {
    expect(css).toMatch(
      /@media \(max-width:\s*1050px\)[\s\S]*\.tournament-directory-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    expect(css).toMatch(
      /\.tournament-card\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;[^}]*max-width:\s*100%;/,
    );
  });

  it("keeps the status above long tournament names on phones", () => {
    expect(css).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.tournament-card-top\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*flex-start;/,
    );
    expect(css).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.tournament-card-badges\s*\{[^}]*order:\s*-1;/,
    );
  });
});

describe("tournament prizes", () => {
  it("provides a fixed two-column layout for four prize places", () => {
    expect(css).toMatch(
      /\.prize-list-four\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
  });
});
