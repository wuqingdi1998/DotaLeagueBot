import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { FINAL_RACE_PREVIEW_WEEK, INITIAL_FINAL_RACE_PREVIEW, finalRacePreviewData, finalRacePreviewReducer, type FinalRacePath } from "./final-race-preview";
import { FinalRacePreviewPanel } from "./FinalRacePreview";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("hides quests before choosing a path and requires a first-day choice", () => {
  expect(finalRacePreviewData(INITIAL_FINAL_RACE_PREVIEW)).toBeNull();
  const html = renderToStaticMarkup(<FinalRacePreviewPanel />);
  expect(html).toContain("Путь Разрушения (Core)");
  expect(html).toContain("Путь Созидания (Support)");
  expect(html).not.toContain('class="compendium-star-race-quest ');
  expect(html).not.toContain("Десятка");
  expect(finalRacePreviewReducer(INITIAL_FINAL_RACE_PREVIEW, { type: "set-day", day: 1 })).toBe(INITIAL_FINAL_RACE_PREVIEW);
  expect(finalRacePreviewReducer({ ...INITIAL_FINAL_RACE_PREVIEW, activeDay: 1 }, { type: "choose-path", path: "core" }).path).toBeNull();
  expect(finalRacePreviewReducer(INITIAL_FINAL_RACE_PREVIEW, { type: "complete", dateKey: FINAL_RACE_PREVIEW_WEEK.quests[0].dateKey })).toBe(INITIAL_FINAL_RACE_PREVIEW);
});

it.each(["core", "support"] as const)("locks %s for the whole week, awards once per day and resets everything", (path) => {
  let state = finalRacePreviewReducer(INITIAL_FINAL_RACE_PREVIEW, { type: "choose-path", path });
  expect(finalRacePreviewReducer(state, { type: "choose-path", path: path === "core" ? "support" : "core" })).toBe(state);
  expect(finalRacePreviewReducer(state, { type: "set-day", day: 7 })).toBe(state);
  expect(finalRacePreviewReducer(state, { type: "complete", dateKey: FINAL_RACE_PREVIEW_WEEK.quests[1].dateKey })).toBe(state);
  for (let day = 0; day < 7; day++) {
    state = finalRacePreviewReducer(state, { type: "set-day", day });
    const action = { type: "complete", dateKey: FINAL_RACE_PREVIEW_WEEK.quests[day].dateKey } as const;
    state = finalRacePreviewReducer(state, action);
    expect(finalRacePreviewReducer(state, action)).toBe(state);
    expect(finalRacePreviewData(state)!.race.personalStars).toBe(day === 6 ? 29 : (day + 1) * 4);
  }
  expect(finalRacePreviewData(state)!.race.quests.map((quest) => quest.rewardStars)).toEqual([4, 4, 4, 4, 4, 4, 5]);
  const html = renderToStaticMarkup(<FinalRacePreviewPanel state={state} />);
  expect(html.match(/Задание выполнено/g)).toHaveLength(7);
  expect(finalRacePreviewReducer(state, { type: "reset" })).toEqual(INITIAL_FINAL_RACE_PREVIEW);
});

function raceFor(path: FinalRacePath) { return finalRacePreviewData({ path, activeDay: 4, completedDays: [] })!.race; }

it("sorts both Friday hero sets alphabetically and applies the requested weekend conditions", () => {
  const core = raceFor("core");
  const support = raceFor("support");
  expect(core.quests[4].heroes.map((hero) => hero.name)).toEqual(["Death Prophet", "Gyrocopter", "Leshrac", "Mars", "Underlord", "Weaver"]);
  expect(support.quests[4].heroes.map((hero) => hero.name)).toEqual(["Chen", "Elder Titan", "Enchantress", "Largo", "Pugna", "Shadow Demon"]);
  expect(core.quests[5].description).toContain("GPM не ниже 700");
  expect(support.quests[5].description).toContain("лечением не менее 10 000");
  expect(core.quests[6]).toMatchObject({ title: "Идеалыч (почти)", description: "Выиграйте рейтинговый или обычный All Pick матч, умерев не более 3 раз." });
  expect(support.quests[6]).toMatchObject({ title: "Универсальный солдат", description: "Выиграйте рейтинговый или обычный All Pick матч: не более 10 смертей и не менее 20 содействий." });
});

it.each(["core", "support"] as const)("states eligible modes and victory in every %s quest, including daily totals", (path) => {
  const { quests } = raceFor(path);
  for (const quest of quests) {
    expect(quest.description).toMatch(/рейтингов\S* или обычн\S* All Pick/);
    expect(quest.description).toMatch(/победн|Выиграйте/);
  }
  for (const day of path === "core" ? [1] : [0, 3]) {
    expect(quests[day].description?.toLowerCase()).toContain("суммарно");
    expect(quests[day].description).toContain("за день");
  }
});

it("keeps experimental conditions out of live race definitions", () => {
  expect(OCTOBER_COMPENDIUM_WEEKS.map((week) => week.quests.length)).toEqual([7, 7, 7]);
  expect(OCTOBER_COMPENDIUM_WEEKS[2].quests.some((quest) => quest.description.includes("здоровья"))).toBe(false);
});
