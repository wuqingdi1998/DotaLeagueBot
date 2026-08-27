import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("season registration table layout", () => {
  it("centers headings over their columns and keeps wins beside registration", () => {
    const section = source(
      "app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
    );
    const styles = source("app/styles/55-season-round-registration.css");

    expect(section.indexOf("season-registration-column-wins")).toBeLessThan(
      section.indexOf("season-registration-column-created"),
    );
    expect(styles).toMatch(
      /\.season-registration-table \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns:/,
    );
    expect(styles).toMatch(
      /\.season-registration-columns,[\s\S]*?\.season-registration-list \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-template-columns: subgrid;/,
    );
    expect(styles).toContain(".season-registration-columns span {\n  text-align: center;");
    expect(styles).toContain(".season-registration-column-wins {\n  grid-column: 6;");
    expect(styles).toContain(".season-registration-column-created {\n  grid-column: 7;");
    expect(styles).toMatch(
      /\.season-registration-wins \{[\s\S]*?grid-column: 6;/,
    );
    expect(styles).toMatch(
      /\.season-registration-list time \{[\s\S]*?grid-column: 7;[\s\S]*?justify-self: center;/,
    );
    expect(styles).not.toContain("span:nth-child(2)");
  });

  it("shows the live refresh countdown only in the ranked wins heading", () => {
    const section = source(
      "app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
    );
    const styles = source("app/styles/55-season-round-registration.css");

    expect(section).toContain('className="season-registration-refresh-timer"');
    expect(section).toContain('role="tooltip"');
    expect(section).toContain("До следующей проверки всех участников:");
    expect(styles).toContain(".season-registration-refresh-timer:hover");
    expect(styles).toContain(".season-registration-refresh-tooltip");
  });
});
