import { describe, expect, it } from "vitest";
import { isParticipantViewEnabled, sessionForParticipantView } from "./participant-view";

const organizer = { isAdmin: true, organizerAccess: "trusted" as const, username: "owner" };
const participant = { isAdmin: false, organizerAccess: null, username: "player" };

describe("participant view", () => {
  it("enables only for the explicit cookie value", () => {
    expect(isParticipantViewEnabled("1")).toBe(true);
    expect(isParticipantViewEnabled("0")).toBe(false);
    expect(isParticipantViewEnabled(undefined)).toBe(false);
  });

  it("masks organizer permissions without changing the account identity", () => {
    expect(sessionForParticipantView(organizer, "1")).toEqual({
      ...organizer,
      isAdmin: false,
      organizerAccess: null,
      hasOrganizerAccess: true,
      isParticipantView: true,
    });
  });

  it("restores the usual organizer view when the cookie is absent", () => {
    expect(sessionForParticipantView(organizer, null)).toMatchObject({
      isAdmin: true,
      organizerAccess: "trusted",
      hasOrganizerAccess: true,
      isParticipantView: false,
    });
  });

  it("also masks temporary password-based organizer access", () => {
    expect(sessionForParticipantView({ ...organizer, organizerAccess: "password" }, "1"))
      .toMatchObject({
        isAdmin: false,
        organizerAccess: null,
        hasOrganizerAccess: true,
        isParticipantView: true,
      });
  });

  it("does not give ordinary participants organizer access", () => {
    expect(sessionForParticipantView(participant, "1")).toMatchObject({
      isAdmin: false,
      organizerAccess: null,
      hasOrganizerAccess: false,
      isParticipantView: false,
    });
  });
});
