import { describe, expect, it } from "vitest";
import { validateDraftLineupSelection } from "./lineup-assignment";

const heroIds = [1, 2, 3, 4, 5];
const playerIds = ["a", "b", "c", "d", "e"];
const valid = heroIds.map((heroId, index) => ({
  heroId,
  playerId: playerIds[index],
}));

describe("Fearless Draft lineup assignment", () => {
  it("accepts one picked hero for every player", () => {
    expect(validateDraftLineupSelection(valid, heroIds, playerIds)).toBeNull();
  });

  it("rejects incomplete, duplicate and foreign assignments", () => {
    expect(validateDraftLineupSelection(valid.slice(0, 4), heroIds, playerIds))
      .toContain("пяти героев");
    expect(validateDraftLineupSelection(
      valid.map((item, index) => index === 4 ? { ...item, playerId: "a" } : item),
      heroIds,
      playerIds,
    )).toContain("одного героя");
    expect(validateDraftLineupSelection(
      valid.map((item, index) => index === 4 ? { ...item, heroId: 99 } : item),
      heroIds,
      playerIds,
    )).toContain("своей команды");
  });
});
