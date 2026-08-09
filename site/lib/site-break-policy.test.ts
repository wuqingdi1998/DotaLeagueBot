import { describe, expect, it } from "vitest";
import { decideSiteBreakAccess } from "./site-break-policy";

describe("site break access policy", () => {
  it("allows everyone while the break is disabled", () => {
    expect(decideSiteBreakAccess({
      isBreakEnabled: false,
      hasOrganizerAccess: false,
      isApiRequest: false,
    })).toBe("allow");
  });

  it("keeps all pages and APIs available to an organizer", () => {
    expect(decideSiteBreakAccess({
      isBreakEnabled: true,
      hasOrganizerAccess: true,
      isApiRequest: true,
    })).toBe("allow");
  });

  it("shows visitors the break screen and blocks their APIs", () => {
    expect(decideSiteBreakAccess({
      isBreakEnabled: true,
      hasOrganizerAccess: false,
      isApiRequest: false,
    })).toBe("show-break");
    expect(decideSiteBreakAccess({
      isBreakEnabled: true,
      hasOrganizerAccess: false,
      isApiRequest: true,
    })).toBe("block-api");
  });
});
