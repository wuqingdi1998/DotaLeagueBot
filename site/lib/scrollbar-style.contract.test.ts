import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const foundation = readFileSync(
  new URL("../app/styles/01-foundation.css", import.meta.url),
  "utf8",
);
const styleRules = readFileSync(
  new URL("../../.codex/rules/04-styles.md", import.meta.url),
  "utf8",
);
const allStyles = loadSiteStyles();

describe("site-wide scrollbar styling", () => {
  it("uses one shared scrollbar design for every visible scrolling area", () => {
    expect(foundation).toContain("*::-webkit-scrollbar");
    expect(foundation).toContain("*::-webkit-scrollbar-track");
    expect(foundation).toContain("*::-webkit-scrollbar-thumb");
    expect(foundation).toContain("*::-webkit-scrollbar-thumb:hover");
    expect(foundation).toMatch(
      /\*\s*\{[^}]*scrollbar-color:\s*var\(--scrollbar-thumb\) var\(--scrollbar-track\);[^}]*scrollbar-width:\s*thin;/,
    );
    expect(allStyles).toMatch(
      /\.fearless-history > div\s*\{[^}]*overflow-y:\s*auto;/,
    );
  });

  it("provides distinct accessible colors for light and dark themes", () => {
    expect(foundation).toContain("--scrollbar-track: #d9eaf3");
    expect(foundation).toContain("--scrollbar-thumb: #2c7695");
    expect(foundation).toContain("--scrollbar-thumb-hover: #006b9f");
    expect(foundation).toMatch(
      /\.site-shell\[data-theme="dark"\][\s\S]*--scrollbar-track:\s*#081a28;[\s\S]*--scrollbar-thumb:\s*#287896;[\s\S]*--scrollbar-thumb-hover:\s*#00a9d9;/,
    );
    expect(foundation).toContain('html:has(.site-shell[data-theme="light"])');
  });

  it("keeps local feature files from defining competing scrollbar colors", () => {
    expect(allStyles.match(/scrollbar-color:/g)).toHaveLength(1);
  });

  it("records the shared-scrollbar requirement for future sections", () => {
    expect(styleRules).toContain("Единый стиль полос прокрутки");
    expect(styleRules).toContain("не задавай локальные цвета");
    expect(styleRules).toContain("обеих цветовых тем");
  });
});
