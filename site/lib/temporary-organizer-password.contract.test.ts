import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authSource = readFileSync(
  new URL("./auth.ts", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0034_fix_temporary_organizer_password_hash.sql",
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
      "94ff9fcf7a1ffde2dbedc524fdc42944f86f882a8c284e8abbf1ba51bdc494fc",
    );
  });
});
