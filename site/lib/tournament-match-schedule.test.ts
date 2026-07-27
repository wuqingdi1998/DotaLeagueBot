import { describe, expect, it } from "vitest";
import {
  filterTournamentMatchSchedule,
  postseasonScheduleRow,
} from "./tournament-match-schedule";

const schedule = [
  { stage_name: "Групповой этап · Раунд 1" },
  { stage_name: "Переигровки за 1–2 места" },
  { stage_name: "Плей-офф · Верхняя сетка" },
  { stage_name: "Гранд-финал" },
];

describe("automatic match schedule selection", () => {
  it("keeps group and postseason schedule rows separate", () => {
    expect(
      filterTournamentMatchSchedule(schedule, "group").map(
        ({ stage_name }) => stage_name,
      ),
    ).toEqual(["Групповой этап · Раунд 1"]);
    expect(
      filterTournamentMatchSchedule(schedule, "postseason").map(
        ({ stage_name }) => stage_name,
      ),
    ).toEqual(["Плей-офф · Верхняя сетка", "Гранд-финал"]);
  });

  it("uses the actual grand-final time instead of a tiebreak row", () => {
    expect(
      postseasonScheduleRow(
        filterTournamentMatchSchedule(schedule, "postseason"),
        "grand_final",
        0,
      )?.stage_name,
    ).toBe("Гранд-финал");
  });
});
