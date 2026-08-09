import { describe, expect, it } from "vitest";
import { DRAFT_SEQUENCE } from "./config";
import { applyDraftAction, previousMapPickedHeroIds } from "./engine";
import { firstChooserForMap } from "./series";
import type { DraftMapState } from "./types";

function draftMap(
  candidateHeroIds: number[],
  unavailableHeroIds: number[],
): DraftMapState {
  let state: DraftMapState = { currentStep: 0, actions: [], unavailableHeroIds };
  for (const step of DRAFT_SEQUENCE) {
    const heroId = candidateHeroIds.find((id) =>
      !state.unavailableHeroIds.includes(id) &&
      !state.actions.some((action) => action.heroId === id),
    );
    if (!heroId) throw new Error("Недостаточно героев для тестового драфта");
    const result = applyDraftAction(state, {
      actor: step.actor,
      type: step.type,
      heroId,
    });
    if (!result.ok) throw new Error(result.reason);
    state = result.state;
  }
  return state;
}

describe("Fearless Draft BO3 flow", () => {
  it("runs three full maps and accumulates only previous picks", () => {
    const heroes = Array.from({ length: 100 }, (_, index) => index + 1);
    const mapOne = draftMap(heroes, []);
    const mapTwoUnavailable = previousMapPickedHeroIds([mapOne]);
    const mapTwo = draftMap(heroes, mapTwoUnavailable);
    const mapThreeUnavailable = previousMapPickedHeroIds([mapOne, mapTwo]);
    const mapThree = draftMap(heroes, mapThreeUnavailable);

    expect(mapOne.actions).toHaveLength(24);
    expect(mapTwo.actions).toHaveLength(24);
    expect(mapThree.actions).toHaveLength(24);
    expect(mapTwoUnavailable).toHaveLength(10);
    expect(mapThreeUnavailable).toHaveLength(20);

    const mapOneBan = mapOne.actions.find((action) => action.type === "BAN")?.heroId;
    expect(mapTwoUnavailable).not.toContain(mapOneBan);
    expect(mapTwo.actions.some((action) => action.heroId === mapOneBan)).toBe(true);
  });

  it("alternates map two and uses a new map three toss", () => {
    expect(firstChooserForMap({
      mapNumber: 2,
      player1Id: "A",
      player2Id: "B",
      map1CoinTossWinnerId: "A",
    })).toBe("B");
    expect(firstChooserForMap({
      mapNumber: 3,
      player1Id: "A",
      player2Id: "B",
      map1CoinTossWinnerId: "A",
      currentCoinTossWinnerId: "A",
    })).toBe("A");
  });
});
