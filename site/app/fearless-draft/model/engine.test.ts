import { describe, expect, it } from "vitest";
import { DRAFT_SEQUENCE } from "./config";
import {
  applyDraftAction,
  countDraftActions,
  isDraftComplete,
  previousMapPickedHeroIds,
} from "./engine";
import type { DraftMapState } from "./types";

function emptyState(unavailableHeroIds: number[] = []): DraftMapState {
  return { currentStep: 0, actions: [], unavailableHeroIds };
}

function completeState(heroStart = 1): DraftMapState {
  return DRAFT_SEQUENCE.reduce((state, step, index) => {
    const result = applyDraftAction(state, {
      actor: step.actor,
      type: step.type,
      heroId: heroStart + index,
    });
    if (!result.ok) throw new Error(result.reason);
    return result.state;
  }, emptyState());
}

describe("Fearless Draft engine", () => {
  it("keeps the exact 24-step Captain's Mode sequence", () => {
    expect(DRAFT_SEQUENCE.map(({ actor, type }) => `${actor} ${type}`)).toEqual([
      "FIRST BAN", "SECOND BAN", "SECOND BAN", "FIRST BAN",
      "SECOND BAN", "SECOND BAN", "FIRST BAN", "FIRST PICK",
      "SECOND PICK", "FIRST BAN", "FIRST BAN", "SECOND BAN",
      "SECOND PICK", "FIRST PICK", "FIRST PICK", "SECOND PICK",
      "SECOND PICK", "FIRST PICK", "FIRST BAN", "SECOND BAN",
      "SECOND BAN", "FIRST BAN", "FIRST PICK", "SECOND PICK",
    ]);
  });

  it("finishes with five picks and seven bans for each participant", () => {
    const state = completeState();
    expect(isDraftComplete(state)).toBe(true);
    expect(countDraftActions(state.actions, "FIRST", "PICK")).toBe(5);
    expect(countDraftActions(state.actions, "SECOND", "PICK")).toBe(5);
    expect(countDraftActions(state.actions, "FIRST", "BAN")).toBe(7);
    expect(countDraftActions(state.actions, "SECOND", "BAN")).toBe(7);
  });

  it("rejects duplicate, banned, picked and previous-map heroes", () => {
    const first = applyDraftAction(emptyState([99]), {
      actor: "FIRST",
      type: "BAN",
      heroId: 1,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(applyDraftAction(first.state, {
      actor: "FIRST",
      type: "BAN",
      heroId: 1,
    }).ok).toBe(false);
    expect(applyDraftAction(first.state, {
      actor: "FIRST",
      type: "BAN",
      heroId: 99,
    }).ok).toBe(false);
  });

  it("only lets the expected participant act", () => {
    expect(applyDraftAction(emptyState(), {
      actor: "SECOND",
      type: "BAN",
      heroId: 1,
    }).ok).toBe(false);
  });

  it("carries only picks across maps", () => {
    const mapOne = completeState(1);
    const unavailable = previousMapPickedHeroIds([mapOne]);
    const picked = mapOne.actions.filter((action) => action.type === "PICK");
    const banned = mapOne.actions.filter((action) => action.type === "BAN");
    expect(unavailable).toEqual(picked.map((action) => action.heroId));
    expect(unavailable).not.toContain(banned[0].heroId);

    const mapTwo = completeState(100);
    expect(previousMapPickedHeroIds([mapOne, mapTwo])).toHaveLength(20);
  });
});
