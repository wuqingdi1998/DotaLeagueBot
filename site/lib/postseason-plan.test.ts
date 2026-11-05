import { expect, it } from "vitest";
import { buildPostseasonMatches } from "./group-generation";
import { postseasonMatchKey } from "./postseason-types";
import { buildDoubleEliminationPlan } from "./postseason-double-elimination";

it("builds upper, lower, lower final and grand final from two upper and two lower qualifiers", () => {
  const plan = buildPostseasonMatches({
    groupNames: ["Группа А"], advancingPerGroup: 2, hasPlayoffStage: true, playoffType: "double_elimination",
    groupAdvancement: [{ advance_to_playoff: 4, advance_to_upper: 2, advance_to_lower: 2 }],
  });
  expect(plan).toHaveLength(4);
  expect(plan.map(match => match.bracketSide)).toEqual(["upper", "lower", "lower", "grand_final"]);
  expect(plan[0].teamAPlaceholder).toBe("1-е место · Группа А");
  expect(plan[1].teamAPlaceholder).toBe("3-е место · Группа А");
  expect(plan[1].teamBPlaceholder).toBe("4-е место · Группа А");
  expect(plan[0].loserTo).toEqual({ matchKey: postseasonMatchKey(plan[2]), slot: "b" });
  expect(plan[0].winnerTo?.matchKey).toBe(postseasonMatchKey(plan[3]));
  expect(plan[2].winnerTo?.matchKey).toBe(postseasonMatchKey(plan[3]));
});

it.each([[2, 0], [4, 0], [8, 0], [2, 2], [4, 4], [3, 1], [1, 3], [8, 2]])(
  "routes every upper loss and produces a complete acyclic bracket (%s upper, %s lower)", (upper, lower) => {
    const plan = buildDoubleEliminationPlan(Array.from({ length: upper }, (_, i) => `U${i}`), Array.from({ length: lower }, (_, i) => `L${i}`));
    expect(plan).toHaveLength(upper * 2 + lower - 2);
    const byKey = new Map(plan.map(match => [postseasonMatchKey(match), match]));
    expect(byKey.size).toBe(plan.length);
    for (const match of plan) {
      if (match.bracketSide === "upper") expect(match.loserTo).toBeDefined();
      if (match.bracketSide !== "grand_final") expect(match.winnerTo).toBeDefined();
      for (const target of [match.winnerTo, match.loserTo]) {
        if (target) expect(byKey.has(target.matchKey)).toBe(true);
      }
    }
    const visiting = new Set<string>(), visited = new Set<string>();
    function visit(key: string) {
      expect(visiting.has(key)).toBe(false);
      if (visited.has(key)) return;
      visiting.add(key);
      const match = byKey.get(key)!;
      for (const target of [match.winnerTo, match.loserTo]) if (target) visit(target.matchKey);
      visiting.delete(key); visited.add(key);
    }
    for (const key of byKey.keys()) visit(key);
  },
);
