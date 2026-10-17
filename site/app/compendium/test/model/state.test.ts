import { expect, it } from "vitest";
import { INITIAL_TEST_STATE, testReducer, testTotals, testRerollsRemaining } from "./state";
import { testMembers } from "./presentation";
import { TEST_RACE_WEEK } from "./config";
import { OCTOBER_COMPENDIUM_WEEKS } from "../../model/october-star-race";
import { testClanActivity } from "./activity";

it("provides exactly twenty named independent participants in each test clan", () => {
  const members = testMembers(INITIAL_TEST_STATE);
  expect(members).toHaveLength(40);
  expect(new Set(members.map((member) => member.discordId)).size).toBe(40);
  expect(new Set(members.map((member) => member.playerName)).size).toBe(40);
  for (const clanId of ["morbus", "panacea"]) expect(members.filter((member) => member.clanId === clanId)).toHaveLength(20);
  expect(members.every((member) => /^[А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё]+$/.test(member.playerName) && member.totalPoints === 0 && member.dotaId.startsWith("sandbox-"))).toBe(true);
  const activity = testClanActivity(testReducer(INITIAL_TEST_STATE, { type: "complete", kind: "outing" }));
  expect(activity.members).toHaveLength(40);
  expect(activity.members.filter((member) => member.dailyStars > 0).map((member) => member.dailyStars)).toEqual([1, 1]);
  expect(testMembers(INITIAL_TEST_STATE)).toEqual(members);
});

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
