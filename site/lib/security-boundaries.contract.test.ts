import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(projectRoot, "..");
const authSource = readFileSync(
  path.join(projectRoot, "lib", "auth.ts"),
  "utf8",
);
const organizerCredentialsSource = readFileSync(
  path.join(projectRoot, "lib", "organizer-credentials.ts"),
  "utf8",
);
const standaloneOrganizerMigration = readFileSync(
  path.join(
    repositoryRoot,
    "bot",
    "database",
    "migrations",
    "0153_standalone_organizer_access.sql",
  ),
  "utf8",
);
const proxySource = readFileSync(
  path.join(projectRoot, "proxy.ts"),
  "utf8",
);
const nextConfig = readFileSync(
  path.join(projectRoot, "next.config.ts"),
  "utf8",
);
const caddyfile = readFileSync(
  path.join(repositoryRoot, "Caddyfile"),
  "utf8",
);

describe("site security boundaries", () => {
  it("protects every organizer route on the server", () => {
    const adminDirectory = path.join(projectRoot, "app", "api", "admin");
    const routeFiles = readdirSync(adminDirectory, {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name === "route.ts")
      .map((entry) =>
        path.join(entry.parentPath, entry.name),
      );
    expect(routeFiles.length).toBeGreaterThan(5);
    for (const routeFile of routeFiles) {
      expect(readFileSync(routeFile, "utf8"), routeFile).toContain(
        "requireAdmin",
      );
    }
  });

  it("separates trusted Discord access from short password sessions", () => {
    expect(authSource).toContain("trusted_organizers");
    expect(authSource).toContain("organizerAccessMethod");
    expect(organizerCredentialsSource).toContain('process.env.ORGANIZER_PASSWORD');
    expect(organizerCredentialsSource).toContain("organizer_passwords");
    expect(organizerCredentialsSource).toContain("scryptSecretHashMatches");
    expect(organizerCredentialsSource).toContain("organizerAttemptLimit = 5");
    expect(authSource).toContain("organizerSessionLifetimeHours");
    expect(authSource).toContain('sameSite: "strict"');
  });

  it("supports a server-side organizer role without a player account", () => {
    expect(standaloneOrganizerMigration).toContain("session_kind = 'standalone'");
    expect(standaloneOrganizerMigration).toContain("role = 'organizer'");
    expect(authSource).toContain("isStandaloneOrganizer: true");
    expect(authSource).toContain("user.isStandaloneOrganizer");
  });

  it("keeps a durable failed-attempt journal and replaces passwords without code edits", () => {
    expect(organizerCredentialsSource).toContain("web_organizer_login_attempts");
    expect(organizerCredentialsSource).toContain("invalid_password");
    expect(organizerCredentialsSource).toContain("createScryptSecretHash");
    expect(organizerCredentialsSource).toContain("UPDATE organizer_passwords SET is_active = FALSE");
  });

  it("applies origin, size and request-frequency protection to all APIs", () => {
    expect(proxySource).toContain("inspectApiRequest");
    expect(proxySource).toContain('"/api/:path*"');
    expect(proxySource).toContain('"/((?!api/|_next/static|_next/image|');
    expect(caddyfile).toMatch(/request_body\s*\{[\s\S]*max_size 55MB/);
  });

  it("does not apply API request limits to public pages", () => {
    expect(proxySource).toMatch(
      /if \(pathname\.startsWith\("\/api\/"\)\) \{[\s\S]*inspectApiRequest/,
    );
  });

  it("retries page requests while the site restarts during publication", () => {
    expect(caddyfile).toMatch(
      /reverse_proxy site:3000\s*\{[\s\S]*lb_try_duration 30s/,
    );
  });

  it("sends browser hardening headers without identifying the framework", () => {
    expect(nextConfig).toContain("Content-Security-Policy");
    expect(nextConfig).toContain("frame-ancestors 'self'");
    expect(nextConfig).toContain("img-src 'self' data: blob:");
    expect(nextConfig).toContain('poweredByHeader: false');
    expect(nextConfig).toContain("X-Content-Type-Options");
  });
});
