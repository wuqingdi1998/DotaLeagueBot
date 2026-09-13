import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const component = readFileSync(
  new URL("../app/tournaments/TournamentsHub.tsx", import.meta.url),
  "utf8",
);
const styles = loadSiteStyles();

describe("community home hero", () => {
  it("shows the current community message", () => {
    expect(component).toMatch(
      /Наши турниры живут здесь\.\s*<span>Твоя история только начинается!<\/span>/,
    );
    expect(component).not.toContain("Турниры живут здесь.\n");
    expect(component).not.toContain("История остаётся.");
  });

  it("keeps the hero compact without the repeated community label or Discord button", () => {
    expect(component).not.toContain('<p className="eyebrow">');
    expect(component).not.toContain("Наш Discord");
    expect(styles).toMatch(
      /\.platform-hero\s*\{[^}]*min-height:\s*420px;[^}]*padding:\s*clamp\(26px,\s*2\.25vw,\s*36px\)/,
    );
  });

  it("halves the heading and pulls it closer to the mobile menu", () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-hero\s*\{[^}]*align-items:\s*start;[^}]*padding:\s*18px 18px 28px;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-hero > \.hero-orb\s*\{[^}]*display:\s*none;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-hero h1\s*\{[^}]*font-size:\s*clamp\(25px,\s*7\.5vw,\s*35px\);[^}]*line-height:\s*1\.12;/,
    );
  });

  it("places the tournament totals in a two-card row above a wide participant card", () => {
    expect(component).toMatch(
      /platform-number-participants[\s\S]*<strong>500\+<\/strong>[\s\S]*участников приняли участие в наших турнирах/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-numbers\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*10px;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-numbers div\s*\{[^}]*border:\s*1px solid var\(--line-strong\);[^}]*border-radius:\s*14px;[^}]*background:\s*var\(--surface\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-numbers \.platform-number-participants\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-template-columns:\s*auto 1fr;/,
    );
  });

  it("places the tournament directory link below the featured event card", () => {
    expect(component).toMatch(
      /featured-event-column[\s\S]*<aside className="featured-event-card">[\s\S]*<\/aside>\s*<Link\s*className="primary-button featured-tournaments-link"[\s\S]*Смотреть турниры/,
    );
    expect(styles).toMatch(
      /\.featured-tournaments-link\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*64px;[^}]*background:\s*linear-gradient\(135deg,\s*var\(--blue-solid\) 0%,\s*var\(--blue-night\) 100%\);[^}]*font-size:\s*19px;/,
    );
    expect(styles).toMatch(
      /\.featured-tournaments-link:hover\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--blue-night\) 0%,\s*var\(--blue-solid\) 100%\);/,
    );
  });
});
