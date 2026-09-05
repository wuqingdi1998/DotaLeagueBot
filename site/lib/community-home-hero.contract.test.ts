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

  it("places the tournament directory link below the featured event card", () => {
    expect(component).toMatch(
      /featured-event-column[\s\S]*<aside className="featured-event-card">[\s\S]*<\/aside>\s*<Link\s*className="primary-button featured-tournaments-link"[\s\S]*Смотреть турниры/,
    );
    expect(styles).toMatch(
      /\.featured-tournaments-link\s*\{[^}]*min-height:\s*64px;[^}]*padding:\s*0 32px;[^}]*background:\s*linear-gradient\(135deg,\s*#08a9df 0%,\s*#2b66bc 100%\);[^}]*font-size:\s*17px;/,
    );
  });
});
