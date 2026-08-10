import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const applicationRoute = source("../app/api/applications/route.ts");
const deletion = source("../app/api/applications/application-deletion.ts");
const controller = source(
  "../app/tournaments/[slug]/hooks/useTournamentController.ts",
);
const adminApplications = source(
  "../app/tournaments/[slug]/admin/ApplicationsAdmin.tsx",
);

describe("declined tournament application deletion", () => {
  it("exposes an organizer-only deletion endpoint", () => {
    expect(applicationRoute).toContain('export { DELETE } from "./application-deletion"');
    expect(deletion).toContain("requireAdmin()");
    expect(deletion).toContain('current.status !== "declined"');
    expect(deletion).toContain("DELETE FROM tournament_team_applications");
  });

  it("offers deletion only after rejection and asks for confirmation", () => {
    expect(adminApplications).toContain('application.status === "declined"');
    expect(adminApplications).toContain("Удалить заявку");
    expect(controller).toContain("window.confirm");
    expect(controller).toContain('method: "DELETE"');
  });
});
