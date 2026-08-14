import { describe, expect, it } from "vitest";
import type { DraftActionSnapshot } from "./snapshot";
import { buildDraftTreeSteps } from "./draft-tree";

function action(step: number, actorId: string): DraftActionSnapshot {
  return {
    step,
    actorId,
    type: "BAN",
    heroId: null,
    isAutomatic: false,
    createdAt: "2026-08-14T00:00:00.000Z",
  };
}

describe("Fearless Draft tree", () => {
  it("uses all 24 current sequence steps and numbers them from one", () => {
    const steps = buildDraftTreeSteps([], "radiant", "radiant");
    expect(steps).toHaveLength(24);
    expect(steps.map((step) => step.number)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    );
    expect(steps.slice(0, 4).map(({ type, isRadiant }) => ({ type, isRadiant }))).toEqual([
      { type: "BAN", isRadiant: true },
      { type: "BAN", isRadiant: false },
      { type: "BAN", isRadiant: false },
      { type: "BAN", isRadiant: true },
    ]);
  });

  it("mirrors future branches when Dire has first pick", () => {
    const steps = buildDraftTreeSteps([], "radiant", "dire");
    expect(steps.slice(0, 4).map((step) => step.isRadiant)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it("places completed actions by their recorded side", () => {
    const [step] = buildDraftTreeSteps([action(0, "dire")], "radiant", "radiant");
    expect(step.isRadiant).toBe(false);
    expect(step.action?.actorId).toBe("dire");
  });
});
