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
  it("requires a fresh organizer password before permanent deletion", () => {
    expect(route).toContain("confirmOrganizerPassword");
    expect(route.indexOf("confirmOrganizerPassword")).toBeLessThan(
      route.indexOf("DELETE FROM tournaments"),
    );
    expect(panel).toContain("Пароль организатора");
    expect(panel).toContain('type="password"');
  });

  it("deletes by tournament id and keeps a deletion audit record", () => {
    expect(route).toContain("WHERE id = $1");
    expect(route).toContain("'tournament_delete'");
    expect(route).toContain("deleted.name");
    expect(route).toContain("deleted.slug");
  });

  it("places the destructive action last in tournament management", () => {
    expect(adminPanel).toContain("<TournamentDeletePanel />");
    expect(adminPanel.indexOf("<TournamentDeletePanel />")).toBeGreaterThan(
      adminPanel.indexOf("<TournamentClonePanel />"),
    );
    expect(panel).toContain("Удалить безвозвратно");
    expect(panel).toContain('window.location.assign("/tournaments")');
  });
});
