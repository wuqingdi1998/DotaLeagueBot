import { describe, expect, it } from "vitest";
import {
  draftSeriesMapCount,
  firstChooserForMap,
  mapNeedsCoinToss,
} from "./series";

describe("Fearless Draft map transitions", () => {
  it("runs two maps in BO2 and three maps in BO3", () => {
    expect(draftSeriesMapCount("BO2")).toBe(2);
    expect(draftSeriesMapCount("BO3")).toBe(3);
  });

  it("uses coin tosses only on maps one and three", () => {
    expect(mapNeedsCoinToss(1)).toBe(true);
    expect(mapNeedsCoinToss(2)).toBe(false);
    expect(mapNeedsCoinToss(3)).toBe(true);
  });

  it("gives map two's first choice to the map one coin loser", () => {
    expect(firstChooserForMap({
      mapNumber: 2,
      player1Id: "A",
      player2Id: "B",
      map1CoinTossWinnerId: "A",
    })).toBe("B");
  });

  it("gives map three's first choice to its new coin winner", () => {
    expect(firstChooserForMap({
      mapNumber: 3,
      player1Id: "A",
      player2Id: "B",
      map1CoinTossWinnerId: "A",
      currentCoinTossWinnerId: "B",
    })).toBe("B");
  });
});
