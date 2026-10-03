import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const formationRepository = readFileSync(
  new URL("./clan-formation-repository.ts", import.meta.url),
  "utf8",
);
const reservationRepository = readFileSync(
  new URL("./clan-reservations.ts", import.meta.url),
  "utf8",
);
const launchRepository = readFileSync(
  new URL("./clan-launch-repository.ts", import.meta.url),
  "utf8",
);

describe("October clan exclusions", () => {
  it("keeps the excluded role out of candidates, reservations and publication", () => {
    expect(formationRepository).toContain("COMPENDIUM_EXCLUDED_ROLE_NAME");
    expect(formationRepository).toContain("AND NOT EXISTS");
    expect(reservationRepository).toContain("is_excluded");
    expect(reservationRepository).toContain("!row.is_excluded");
    expect(launchRepository).toContain("COMPENDIUM_EXCLUDED_ROLE_NAME");
    expect(launchRepository).toContain("WHERE NOT EXISTS");
  });
});
