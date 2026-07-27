import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./auth-error";

describe("Discord login error messages", () => {
  it("shows a clear message for a temporary Discord failure", () => {
    expect(getAuthErrorMessage("discord")).toContain(
      "Discord временно не отвечает",
    );
  });

  it("ignores unknown values from the address bar", () => {
    expect(getAuthErrorMessage("unknown")).toBeNull();
  });
});
