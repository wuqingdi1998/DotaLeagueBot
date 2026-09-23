import { describe, expect, it } from "vitest";
import {
  organizerAccessMethod,
  requiresFreshOrganizerPassword,
} from "./organizer-access";

describe("organizer access policy", () => {
  it("grants trusted Discord organizers permanent access", () => {
    expect(organizerAccessMethod(true, false)).toBe("trusted");
    expect(organizerAccessMethod(true, true)).toBe("trusted");
  });

  it("keeps password sessions separate from trusted access", () => {
    expect(organizerAccessMethod(false, true)).toBe("password");
    expect(organizerAccessMethod(false, false)).toBeNull();
  });

  it("requires a fresh password only from password-based organizers", () => {
    expect(requiresFreshOrganizerPassword("trusted")).toBe(false);
    expect(requiresFreshOrganizerPassword("password")).toBe(true);
    expect(requiresFreshOrganizerPassword(null)).toBe(false);
  });
});
