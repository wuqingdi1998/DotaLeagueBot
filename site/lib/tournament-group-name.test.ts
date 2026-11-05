import { expect, it } from "vitest";
import { groupMatchStage, groupSeedLabel, tournamentGroupLabel } from "./tournament-group-name";

it("hides blank group names in match stages and avoids repeating the stage name", () => {
  expect(groupMatchStage("", 2)).toBe("Групповой этап · Раунд 2");
  expect(groupMatchStage("Групповой этап", 2)).toBe("Групповой этап · Раунд 2");
  expect(groupMatchStage("Первая группа", 2)).toBe("Групповой этап · Первая группа · Раунд 2");
});
it("keeps unnamed group choices and seed origins distinguishable", () => {
  expect(tournamentGroupLabel({ name: "", sort_order: 2 })).toBe("Группа 3");
  expect(groupSeedLabel("", 3, 0, 1)).toBe("3-е место группового этапа");
  expect(groupSeedLabel("", 3, 1, 2)).toBe("3-е место · Группа 2");
});
