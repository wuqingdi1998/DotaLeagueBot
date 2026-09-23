import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const route = source("../app/api/admin/tournament-delete/route.ts");
const panel = source(
  "../app/tournaments/[slug]/admin/TournamentDeletePanel.tsx",
);
const adminPanel = source(
  "../app/tournaments/[slug]/admin/TournamentAdminPanel.tsx",
);

describe("tournament deletion contract", () => {
  it("confirms permanent deletion according to organizer access", () => {
    expect(route).toContain("confirmSensitiveOrganizerAction");
    expect(route.indexOf("confirmSensitiveOrganizerAction")).toBeLessThan(
      route.indexOf("DELETE FROM tournaments"),
    );
    expect(panel).toContain("<OrganizerPasswordField");
    expect(panel).toContain("requiresPasswordConfirmation");
    expect(panel).toContain("value={password}");
  });

  it("deletes by tournament id and keeps a deletion audit record", () => {
    expect(route).toContain("WHERE id = $1");
    expect(route).toContain("'tournament_delete'");
    expect(route).toContain("deleted.name");
    expect(route).toContain("deleted.slug");
  });

  it("places the destructive action last in tournament management", () => {
    expect(adminPanel).toContain("<TournamentDeletePanel />");
    expect(adminPanel.lastIndexOf("<TournamentDeletePanel />")).toBeGreaterThan(
      adminPanel.indexOf("<TournamentClonePanel />"),
    );
    expect(panel).toContain("Удалить безвозвратно");
    expect(panel).toContain('window.location.assign("/tournaments")');
  });

  it("keeps tournament deletion available in simplified close management", () => {
    const closeBranch = adminPanel.slice(
      adminPanel.indexOf("if (data.tournament.close_event_id)"),
      adminPanel.indexOf("const isSeasonal"),
    );
    expect(closeBranch).toContain("<CloseTournamentAdmin />");
    expect(closeBranch).toContain("<TournamentDeletePanel />");
    expect(panel).toContain("Анонс клоза в Discord удалён не будет.");
  });
});
