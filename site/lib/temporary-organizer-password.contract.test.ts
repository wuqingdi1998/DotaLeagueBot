import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authSource = readFileSync(
  new URL("./auth.ts", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0033_temporary_organizer_password.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("temporary organizer password", () => {
  it("accepts only active temporary passwords", () => {
    expect(authSource).toContain("temporary_organizer_passwords");
    expect(authSource).toContain("expires_at > NOW()");
  });

  it("cannot create a session beyond the temporary password expiry", () => {
    expect(authSource).toContain("temporaryPasswordExpiresAt");
    expect(authSource).toContain("Math.min");
  });

  it("expires at 20:00 Moscow time on 31 July 2026", () => {
    expect(migration).toContain("2026-07-31 20:00:00+03");
  });

  it("stores no readable temporary password", () => {
    expect(migration).not.toContain("ВРЕМЯ");
    expect(migration).toContain(
      "e348d8d0564992652cc3e8e5ae7dbcbed9ecdea4db96c573d8b2087643ee2569",
    );
  });
});
