import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("../app/tournaments/TournamentsHub.tsx", import.meta.url),
  "utf8",
);

describe("community home hero", () => {
  it("shows the current community message", () => {
    expect(component).toMatch(
      /Наши турниры живут здесь\.\s*<span>Твоя история только начинается!<\/span>/,
    );
    expect(component).not.toContain("Турниры живут здесь.\n");
    expect(component).not.toContain("История остаётся.");
  });
});
