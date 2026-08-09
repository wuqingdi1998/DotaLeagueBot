import { describe, expect, it } from "vitest";
import {
  canRespondToDraftEndRequest,
  draftEndRequestExpiresAt,
  markNextMapReady,
} from "./agreement";

describe("Fearless Draft mutual agreement", () => {
  it("does not start the next map after only one player is ready", () => {
    expect(markNextMapReady({
      player1Id: "A",
      player2Id: "B",
      player1Ready: false,
      player2Ready: false,
    }, "A")).toEqual({
      player1Ready: true,
      player2Ready: false,
      shouldAdvance: false,
    });
  });

  it("starts the next map after both players are ready", () => {
    expect(markNextMapReady({
      player1Id: "A",
      player2Id: "B",
      player1Ready: true,
      player2Ready: false,
    }, "B").shouldAdvance).toBe(true);
  });

  it("lets only the opponent answer an end request", () => {
    expect(canRespondToDraftEndRequest("A", "A")).toBe(false);
    expect(canRespondToDraftEndRequest("A", "B")).toBe(true);
  });

  it("expires an unanswered end request after exactly five minutes", () => {
    const requestedAt = new Date("2026-08-09T12:00:00.000Z");
    expect(draftEndRequestExpiresAt(requestedAt).toISOString()).toBe(
      "2026-08-09T12:05:00.000Z",
    );
  });
});
