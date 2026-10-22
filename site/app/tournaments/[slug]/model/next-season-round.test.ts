import { expect, it } from "vitest";
import { nextSeasonRoundNumber } from "./next-season-round";
const rounds = Array.from({ length: 9 }, (_, index) => ({ round_number: index + 1, round_kind: "regular", is_visible: true, results_announced: index < 7 }));
it("keeps round eight highlighted until its result post is sent", () => {
  expect(nextSeasonRoundNumber(rounds)).toBe(8);
  expect(nextSeasonRoundNumber(rounds.map((round) => ({ ...round, results_announced: round.round_number <= 8 })))).toBe(9);
});
it("never highlights hidden rounds or finals", () => {
  expect(nextSeasonRoundNumber(rounds.map((round) => ({ ...round, is_visible: round.round_number !== 8 })))).toBeNull();
  expect(nextSeasonRoundNumber([])).toBeNull();
});
