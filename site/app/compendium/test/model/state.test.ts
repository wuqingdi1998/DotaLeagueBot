import { expect, it } from "vitest";
import { INITIAL_TEST_STATE, testReducer, testTotals, testRerollsRemaining } from "./state";
import { testMembers } from "./presentation";
import { TEST_RACE_WEEK } from "./config";
import { OCTOBER_COMPENDIUM_WEEKS } from "../../model/october-star-race";

it("keeps race, daily, rune and clan totals independent from live definitions and identities", () => {
  const liveBefore = JSON.stringify(OCTOBER_COMPENDIUM_WEEKS);
  let state = testReducer(INITIAL_TEST_STATE, { type: "race", action: { type: "choose-path", path: "support" } });
  state = testReducer(state, { type: "race", action: { type: "complete", dateKey: TEST_RACE_WEEK.quests[0].dateKey } });
  state = testReducer(state, { type: "complete", kind: "daily-1" });
  state = testReducer(state, { type: "complete", kind: "outing" });
  state = testReducer(state, { type: "rune-hero", heroId: 1 });
  state = testReducer(state, { type: "complete", kind: "rune" });
  expect(testTotals(state)).toEqual({ personal: 7, weekly: 6, partner: 1 });
  expect(testReducer(state, { type: "complete", kind: "rune" })).toBe(state);
  expect(testMembers(state).every((member) => member.discordId.startsWith("sandbox-"))).toBe(true);
  expect(JSON.stringify(OCTOBER_COMPENDIUM_WEEKS)).toBe(liveBefore);
  expect(TEST_RACE_WEEK).not.toBe(OCTOBER_COMPENDIUM_WEEKS[2]);
  expect(testReducer(state, { type: "reset" })).toEqual(INITIAL_TEST_STATE);
});

it("uses only local daily reroll and weekend reward state", () => {
  let state = testReducer(INITIAL_TEST_STATE, { type: "race", action: { type: "choose-path", path: "core" } });
  state = testReducer(state, { type: "race", action: { type: "set-day", day: 4 } });
  state = testReducer(state, { type: "complete", kind: "daily-1" });
  expect(testTotals(state).personal).toBe(2);
  expect(testReducer(state, { type: "reroll", position: 1 })).toBe(state);
  state = testReducer(state, { type: "reroll", position: 2 });
  expect(testRerollsRemaining(state)).toBe(0);
  expect(testReducer(state, { type: "reroll", position: 2 })).toBe(state);
  state = testReducer(state, { type: "bonus" });
  state = testReducer(state, { type: "bonus" });
  expect(testRerollsRemaining(state)).toBe(1);
});
