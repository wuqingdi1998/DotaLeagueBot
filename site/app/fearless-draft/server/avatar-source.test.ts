import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const auth = readFileSync(resolve(process.cwd(), "lib/auth.ts"), "utf8");
const snapshot = readFileSync(
  resolve(process.cwd(), "app/fearless-draft/server/snapshot-service.ts"),
  "utf8",
);

describe("profile avatar source", () => {
  it("prefers the current server profile avatar over an old login avatar", () => {
    expect(auth).toMatch(
      /COALESCE\(\s*NULLIF\(p\.avatar_url, ''\),\s*NULLIF\(s\.discord_avatar_url, ''\)\s*\)/,
    );
    expect(snapshot).toMatch(
      /COALESCE\(\s*NULLIF\(player\.avatar_url, ''\),\s*NULLIF\(latest\.discord_avatar_url, ''\)\s*\)/,
    );
  });
});
