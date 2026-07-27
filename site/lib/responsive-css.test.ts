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

describe("tournament prizes", () => {
  it("provides a fixed two-column layout for four prize places", () => {
    expect(css).toMatch(
      /\.prize-list-four\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
  });
});
