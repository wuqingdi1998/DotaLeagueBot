import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const responsiveStyles = readFileSync(
  new URL("../app/styles/08-tournament-responsive.css", import.meta.url),
  "utf8",
);

describe("mobile tournament management", () => {
  it("keeps organizer panels and headings inside phone screens", () => {
    expect(responsiveStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.admin-panel\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/,
    );
    expect(responsiveStyles).toMatch(
      /\.tournament-content-editor \.editor-heading h3\s*\{[^}]*font-size:\s*clamp\([^;]+;[^}]*overflow-wrap:\s*anywhere;/,
    );
  });

  it("stacks schedule controls without horizontal overflow", () => {
    expect(responsiveStyles).toMatch(
      /@media \(max-width:\s*600px\)[\s\S]*?\.schedule-admin-day-head,[\s\S]*?\.schedule-admin-entry\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    expect(responsiveStyles).toMatch(
      /\.schedule-admin-day input,[\s\S]*?\.schedule-admin-entry input\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/,
    );
  });

  it("gives rules, team applications, and actions the full mobile width", () => {
    expect(responsiveStyles).toMatch(
      /\.rule-admin-row\s*\{[^}]*grid-template-columns:\s*38px minmax\(0,\s*1fr\);/,
    );
    expect(responsiveStyles).toMatch(
      /\.application-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    expect(responsiveStyles).toMatch(
      /\.application-roster-links li\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;/,
    );
  });

  it("uses tighter but readable spacing on the narrowest phones", () => {
    expect(responsiveStyles).toMatch(/@media \(max-width:\s*380px\)/);
    expect(responsiveStyles).not.toMatch(/font-size:\s*(?:[0-9]|1[0-2])px/);
  });
});
