import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("season admin player identifiers", () => {
  it("accepts both registered and archived players in a match lineup", () => {
    const model = readFileSync(
      new URL(
        "../app/api/admin/season/season-admin-model.ts",
        import.meta.url,
      ),
      "utf8",
    );

    expect(model).toContain("isSeasonPlayerDatabaseId");
    expect(model).toContain("!isSeasonPlayerDatabaseId(id)");
    expect(model).not.toContain("!/^\\d{1,20}$/.test(id)");
  });

  it(
    "checks that a selected archive player really exists before saving",
    () => {
      const actions = readFileSync(
        new URL(
          "../app/api/admin/season/season-match-actions.ts",
          import.meta.url,
        ),
        "utf8",
      );

      expect(actions).toContain("discord_id = ANY($1::bigint[])");
      expect(actions).toContain(
        "players.rowCount !== selected.length",
      );
    },
  );
});
