import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(projectRoot, "..");
const authSource = readFileSync(
  path.join(projectRoot, "lib", "auth.ts"),
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

  it("keeps organizer access behind a separate password and short session", () => {
    expect(authSource).toContain('process.env.ORGANIZER_PASSWORD');
    expect(authSource).toContain("configuredPassword.length < 12");
    expect(authSource).toContain("organizerAttemptLimit = 5");
    expect(authSource).toContain("organizerSessionLifetimeHours = 12");
    expect(authSource).toContain('sameSite: "strict"');
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
      /reverse_proxy site:3000\s*\{[\s\S]*lb_try_duration 10s/,
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
