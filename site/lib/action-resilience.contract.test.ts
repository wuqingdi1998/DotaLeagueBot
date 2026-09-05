import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

function sources(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = new URL(entry.name, directory);
    return entry.isDirectory() ? sources(new URL(`${file.href}/`))
      : /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.") ? [file] : [];
  });
}

describe("site-wide action resilience", () => {
  it("routes all browser writes through the shared protected transport", () => {
    const unprotected = sources(new URL("../app/", import.meta.url)).filter((file) => {
      const text = readFileSync(file, "utf8");
      return text.includes('"use client"') && /method:\s*["'](?:POST|PUT|PATCH|DELETE)/.test(text)
        && /\bfetch\(/.test(text);
    });
    expect(unprotected).toEqual([]);
  });

  it("reloads the actual proxy configuration before replacing the site", () => {
    const workflow = readFileSync(new URL("../../.github/workflows/deploy.yml", import.meta.url), "utf8");
    const script = readFileSync(new URL("../../scripts/reload-site-proxy.sh", import.meta.url), "utf8");
    expect(workflow.indexOf("bash scripts/reload-site-proxy.sh")).toBeLessThan(workflow.indexOf("docker compose up -d --no-deps --remove-orphans bot site proxy"));
    expect(script).toContain("--config /dev/stdin --adapter caddyfile < Caddyfile");
    expect(script).toContain('policy.get("try_duration") == 30000000000');
    expect(script).toContain('[{"method": ["GET", "HEAD"]}]');
  });
});
