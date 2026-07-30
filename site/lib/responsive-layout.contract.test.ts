import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const directoryStyles = readFileSync(
  new URL("../app/styles/11-tournament-directory.css", import.meta.url),
  "utf8",
);

describe("responsive tournament layouts", () => {
  it("keeps all directory filters visible on compact phones", () => {
    expect(directoryStyles).toMatch(
      /@media \(max-width: 420px\)[\s\S]*\.directory-filters\s*\{[\s\S]*overflow-x:\s*hidden/,
    );
    expect(directoryStyles).toMatch(
      /@media \(max-width: 420px\)[\s\S]*\.directory-filters button\s*\{[\s\S]*padding:\s*0 8px/,
    );
  });
});
