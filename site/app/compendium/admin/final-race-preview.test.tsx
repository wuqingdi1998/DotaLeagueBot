import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { finalRacePreviewData } from "./final-race-preview";
import { FinalRacePreviewPanel } from "./FinalRacePreview";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it.each(["core", "support"] as const)("awards only the selected %s path and locks its alternative for every day", (path) => {
  for (let day = 0; day < 7; day++) {
    const { lanes } = finalRacePreviewData(day, true, path);
    expect(lanes).toHaveLength(2);
    for (let date = 0; date <= day; date++) {
      expect(lanes.map((lane) => lane.quests[date]).filter((quest) => quest.completion)).toHaveLength(1);
      expect(lanes[0].quests[date].rewardStars).toBe(lanes[1].quests[date].rewardStars);
    }
    const html = renderToStaticMarkup(<FinalRacePreviewPanel activeDay={day} isCompleted completedPath={path} />);
    expect(html.match(/Награда уже получена/g)).toHaveLength(day + 1);
    expect(html).toContain("Каждый день выбирайте любое из двух заданий");
    for (const button of html.matchAll(/<button([^>]*)>Проверить<\/button>/g)) {
      expect(button[1]).toContain('disabled=""');
    }
  }
});

it("keeps experimental conditions out of live race definitions", () => {
  expect(OCTOBER_COMPENDIUM_WEEKS.map((week) => week.quests.length)).toEqual([7, 7, 7]);
  expect(OCTOBER_COMPENDIUM_WEEKS[2].quests.some((quest) => quest.description.includes("здоровья"))).toBe(false);
});
