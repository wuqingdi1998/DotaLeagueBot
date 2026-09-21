import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const component = readFileSync(
  new URL("../app/tournaments/TournamentsHub.tsx", import.meta.url),
  "utf8",
);
const styles = loadSiteStyles();

describe("community home heading", () => {
  it("aligns the community title with the cards below", () => {
    expect(styles).toMatch(
      /\.platform-purpose > div:first-child\s*\{[^}]*max-width:\s*var\(--site-content-max\);[^}]*margin-inline:\s*auto;/,
    );
  });

  it("keeps the title split into readable blocks without forbidding wrapping", () => {
    expect(component).toMatch(
      /platform-purpose-title[\s\S]*<span>Сайт сообщества<\/span>[\s\S]*<span>Linken&apos;s Sphere Esports<\/span>/,
    );
    expect(styles).toMatch(/\.platform-purpose-title span\s*\{[^}]*display:\s*block;/);
    expect(styles).not.toMatch(
      /\.platform-purpose-title span\s*\{[^}]*white-space:\s*nowrap;/,
    );
  });

  it("fits the second line on narrow phone screens", () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-purpose \.platform-purpose-title\s*\{[^}]*font-size:\s*25px;/,
    );
  });

  it("uses two compact purpose cards and hides events on phones", () => {
    expect(component).toContain('<article className="purpose-events-card">');
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.purpose-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*9px;[^}]*margin-top:\s*19px;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.purpose-events-card\s*\{[^}]*display:\s*none;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.purpose-grid article\s*\{[^}]*min-height:\s*170px;[^}]*border-radius:\s*11px;[^}]*padding:\s*16px;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.purpose-grid h3\s*\{[^}]*font-size:\s*17px;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.purpose-grid p\s*\{[^}]*font-size:\s*13px;/,
    );
  });
});
