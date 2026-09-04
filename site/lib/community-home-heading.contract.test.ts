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
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-purpose-title\s*\{[^}]*font-size:\s*clamp\(24px,\s*7\.75vw,\s*38px\);/,
    );
  });
});
