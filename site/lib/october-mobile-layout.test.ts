import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const mobileStyles = readFileSync(
  new URL("../app/styles/70-october-compendium-mobile.css", import.meta.url), "utf8",
);
const routeStyles = readFileSync(
  new URL("../app/styles/compendium-route.css", import.meta.url), "utf8",
);

describe("October mobile presentation", () => {
  it("limits every mobile rule to tablet and phone widths without changing desktop", () => {
    const root = postcss.parse(mobileStyles);
    let ruleCount = 0;
    root.walkRules((rule) => {
      ruleCount += 1;
      expect(rule.parent?.type).toBe("atrule");
      expect(rule.parent).toMatchObject({ name: "media" });
      expect((rule.parent as postcss.AtRule).params).toMatch(/^\(max-width: (960|720|360)px\)$/);
    });
    expect(ruleCount).toBeGreaterThan(0);
    expect(routeStyles.trim().split(/\r?\n/).at(-1))
      .toBe('@import "./70-october-compendium-mobile.css";');
  });
});
