import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const migration = source("../bot/database/migrations/0063_site_break.sql");
const proxy = source("proxy.ts");
const adminRoute = source("app/api/admin/site-break/route.ts");
const organizerAccess = source("app/tournaments/OrganizerAccess.tsx");
const watcher = source("app/components/SiteBreakWatcher.tsx");

describe("site-wide organizer break", () => {
  it("stores one durable break state with an organizer audit", () => {
    expect(migration).toContain("site_runtime_settings");
    expect(migration).toContain("CHECK (id = 1)");
    expect(migration).toContain("is_break_enabled BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("updated_by BIGINT REFERENCES players(discord_id)");
  });

  it("blocks pages and APIs while preserving organizer recovery", () => {
    expect(proxy).toContain("isSiteBreakEnabled");
    expect(proxy).toContain("hasOrganizerSession");
    expect(proxy).toContain('breakUrl.pathname = "/break"');
    expect(proxy).toContain("pathname.startsWith(\"/api/\")");
    expect(proxy).toContain("isSiteBreakBypassPath");
  });

  it("lets only an organizer switch the break", () => {
    expect(adminRoute).toContain("requireAdmin");
    expect(adminRoute).toContain("setSiteBreakEnabled");
    expect(organizerAccess).toContain("user?.isAdmin && <SiteBreakButton />");
  });

  it("moves already open visitor pages to the break screen", () => {
    expect(watcher).toContain("window.setInterval");
    expect(watcher).toContain('window.location.replace("/break")');
    expect(watcher).toContain("!status.hasOrganizerAccess");
  });
});
