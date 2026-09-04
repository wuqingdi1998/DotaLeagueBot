import { describe, expect, it } from "vitest";
import type { DraftActionSnapshot } from "./snapshot";
import { buildDraftTreeRows, buildDraftTreeSteps } from "./draft-tree";

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
    expect(steps.slice(0, 7).map(({ type, isRadiant }) => ({ type, isRadiant }))).toEqual([
      { type: "BAN", isRadiant: true },
      { type: "BAN", isRadiant: true },
      { type: "BAN", isRadiant: false },
      { type: "BAN", isRadiant: false },
      { type: "BAN", isRadiant: true },
      { type: "BAN", isRadiant: false },
      { type: "BAN", isRadiant: false },
    ]);
  });

  it("mirrors future branches when Dire has first pick", () => {
    const steps = buildDraftTreeSteps([], "radiant", "dire");
    expect(steps.slice(0, 7).map((step) => step.isRadiant)).toEqual([
      false,
      false,
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it("places completed actions by their recorded side", () => {
    const [step] = buildDraftTreeSteps([action(0, "dire")], "radiant", "radiant");
    expect(step.isRadiant).toBe(false);
    expect(step.action?.actorId).toBe("dire");
  });

  it("matches the Dire-first-pick layout and never pairs different phases", () => {
    const rows = buildDraftTreeRows([], "radiant", "dire");

    expect(rows).toHaveLength(14);
    expect(rows.map(({ radiant, dire }) => [radiant?.number, dire?.number])).toEqual([
      [undefined, 1],
      [3, 2],
      [4, 5],
      [6, undefined],
      [7, undefined],
      [9, 8],
      [undefined, 10],
      [12, 11],
      [13, 14],
      [16, 15],
      [17, 18],
      [20, 19],
      [22, 21],
      [24, 23],
    ]);
    expect(rows.flatMap(({ radiant, dire }) => [radiant, dire]
      .filter((step) => step !== undefined)
      .sort((left, right) => left.number - right.number)
      .map((step) => step.number))).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    );
  });

  it("mirrors the complete tree when Radiant has first pick", () => {
    const rows = buildDraftTreeRows([], "radiant", "radiant");

    expect(rows.map(({ radiant, dire }) => [radiant?.number, dire?.number])).toEqual([
      [1, undefined],
      [2, 3],
      [5, 4],
      [undefined, 6],
      [undefined, 7],
      [8, 9],
      [10, undefined],
      [11, 12],
      [14, 13],
      [15, 16],
      [18, 17],
      [19, 20],
      [21, 22],
      [23, 24],
    ]);
  });
});
