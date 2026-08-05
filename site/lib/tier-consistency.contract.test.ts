import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const seasonTierEditor = source(
  "../app/tournaments/[slug]/admin/SeasonTeamSelection.tsx",
);
const seasonAdminModel = source(
  "../app/api/admin/season/season-admin-model.ts",
);
const archiveRosterEditor = source(
  "../app/tournaments/[slug]/ArchiveRosterEditor.tsx",
);
const archiveRosterRoute = source(
  "../app/api/admin/archive-rosters/route.ts",
);

describe("tier consistency", () => {
  it("uses the same 0-12 range in historical tier forms and validation", () => {
    expect(seasonTierEditor).toContain('max="12"');
    expect(seasonTierEditor).not.toContain('max="20"');
    expect(archiveRosterEditor).toContain('max="12"');
    expect(archiveRosterEditor).not.toContain('max="20"');
    expect(seasonAdminModel).toContain("от 0 до 12");
    expect(seasonAdminModel).not.toContain("от 0 до 20");
    expect(archiveRosterRoute).toContain("Number(player.tier) > 12");
  });
});
