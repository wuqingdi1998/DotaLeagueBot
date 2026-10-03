import { describe, expect, it } from "vitest";
import {
  octoberReservationForStartedPreview,
  type OctoberClanReservationState,
} from "./clan-reservation";

const hiddenReservation: OctoberClanReservationState = {
  phase: "hidden",
  isAuthenticated: true,
  hasAccess: true,
  canReserve: false,
  accessRoleName: "Руна Регенерации",
  selectedClanId: null,
};

describe("October clan reservation preview", () => {
  it("opens reservation controls for an eligible signed-in organizer", () => {
    expect(octoberReservationForStartedPreview(hiddenReservation, true)).toEqual({
      ...hiddenReservation,
      phase: "reservation",
      canReserve: true,
    });
  });

  it("does not grant access without an eligible subscription", () => {
    expect(octoberReservationForStartedPreview({
      ...hiddenReservation,
      hasAccess: false,
      accessRoleName: null,
    }, true).canReserve).toBe(false);
  });

  it("does not reopen formation or published phases", () => {
    for (const phase of ["formation", "published"] as const) {
      const state = { ...hiddenReservation, phase };
      expect(octoberReservationForStartedPreview(state, true)).toBe(state);
    }
  });
});
