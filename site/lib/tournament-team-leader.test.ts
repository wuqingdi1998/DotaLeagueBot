import { expect, it } from "vitest";
import { usesLeagueCupManager } from "./tournament-team-leader";

it.each([
  ["2025-11-01T00:00:00+03:00", false],
  ["2026-11-01T00:00:00+03:00", true],
  ["2027-11-01T00:00:00+03:00", true],
] as const)("keeps the manager policy tied to the cup generation (%s)", (start_at, expected) => {
  expect(usesLeagueCupManager({ tournament_type: "seasonal_cup", start_at })).toBe(expected);
});

it("keeps captains in other tournament types", () => {
  expect(usesLeagueCupManager({ tournament_type: "ordinary", start_at: "2027-11-01" })).toBe(false);
});
