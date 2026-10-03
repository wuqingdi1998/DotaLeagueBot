import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("October compendium controlled launch", () => {
  it("keeps the report private and exposes the decision only to organizers", () => {
    const page = source("../app/organizer/compendium-october/launch/page.tsx");
    const route = source("../app/api/admin/compendium-october-launch/route.ts");
    expect(page).toContain("if (!user?.isAdmin) notFound()");
    expect(route).toContain("await requireAdmin()");
    expect(route).toContain('body.decision !== "approve"');
    expect(route).toContain('body.decision !== "cancel"');
  });

  it("stores a draft before publishing only an approved decision", () => {
    const repository = source(
      "../app/organizer/compendium-october/services/clan-launch-repository.ts",
    );
    expect(repository).toContain("october_compendium_clan_assignment_drafts");
    expect(repository).toContain("status !== \"approved\"");
    expect(repository.indexOf("DELETE FROM october_compendium_clan_members"))
      .toBeGreaterThan(repository.indexOf("status !== \"approved\""));
    expect(repository).toContain("october_compendium_launch_review");
  });

  it("keeps daily tasks closed until the approved draft is published", () => {
    const page = source("../app/compendium/page.tsx");
    expect(page).toContain(
      'areDailyQuestsOpen={scheduledPhase === "published" && formationStatus === "complete"}',
    );
  });

  it("offers the launch center from both organizer entry points", () => {
    const archive = source("../app/organizer/sections/OrganizerArchive.tsx");
    const menu = source(
      "../app/organizer/compendium-october/components/OctoberPreviewProfileActions.tsx",
    );
    expect(archive).toContain('/organizer/compendium-october/launch');
    expect(menu).toContain('/organizer/compendium-october/launch');
  });
});
