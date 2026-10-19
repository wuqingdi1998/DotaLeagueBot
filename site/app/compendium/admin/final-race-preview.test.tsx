import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { FINAL_RACE_PREVIEW_WEEK, INITIAL_FINAL_RACE_PREVIEW, finalRacePreviewData, finalRacePreviewReducer, type FinalRacePath } from "./final-race-preview";
import { FinalRacePreviewPanel } from "./FinalRacePreview";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("hides quests before choosing a path and allows a late choice without backfilling earlier days", () => {
  expect(finalRacePreviewData(INITIAL_FINAL_RACE_PREVIEW)).toBeNull();
  const html = renderToStaticMarkup(<FinalRacePreviewPanel />);
  expect(html).toContain("Путь Разрушения (Core)");
  expect(html).toContain("Путь Созидания (Support)");
  expect(html).not.toContain('class="compendium-star-race-quest ');
  expect(html).not.toContain("Понедельник день тяжелый");
  expect(finalRacePreviewReducer(INITIAL_FINAL_RACE_PREVIEW, { type: "set-day", day: 1 })).toBe(INITIAL_FINAL_RACE_PREVIEW);
  const late = finalRacePreviewReducer({ ...INITIAL_FINAL_RACE_PREVIEW, activeDay: 1 }, { type: "choose-path", path: "core" });
  expect(late.path).toBe("core");
  expect(late.selectedDay).toBe(1);
  const past = finalRacePreviewReducer(late, { type: "set-day", day: 0 });
  expect(finalRacePreviewReducer(past, { type: "complete", dateKey: FINAL_RACE_PREVIEW_WEEK.quests[0].dateKey }).completedDays).toEqual([]);
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
  expect(core.quests[5]).toMatchObject({
    title: "Золотой темп",
    description: "Наберите суммарно 60 000 ценности в победных рейтинговых или обычных All Pick матчах за день.",
    requirement: { kind: "cumulative-net-worth", target: 60_000 },
  });
  expect(support.quests[5].description).toContain("лечением не менее 10 000");
  expect(core.quests[6]).toMatchObject({ title: "Идеалыч (почти)", description: "Выиграйте рейтинговый или обычный All Pick матч, умерев не более 3 раз." });
  expect(support.quests[6]).toMatchObject({ title: "Универсальный солдат", description: "Выиграйте рейтинговый или обычный All Pick матч: не более 10 смертей и не менее 20 содействий." });
});

it.each(["core", "support"] as const)("states the selected %s title and eligible modes, with ranked-only Monday", (path) => {
  const { title, quests } = raceFor(path);
  expect(title).toBe(path === "core" ? "Гонка за звёздами · Путь Разрушения" : "Гонка за звёздами · Путь Созидания");
  expect(quests[0]).toMatchObject({ title: "Понедельник день тяжелый", description: "Выиграть 1 рейтинговую игру." });
  expect(quests[0].description).not.toContain("All Pick");
  for (const quest of quests.slice(1)) {
    expect(quest.description).toMatch(/рейтингов\S* или обычн\S* All Pick/);
    expect(quest.description).toMatch(/победн|Выиграйте/);
  }
  for (const day of path === "core" ? [1, 5] : [3]) {
    expect(quests[day].description?.toLowerCase()).toContain("суммарно");
    expect(quests[day].description).toContain("за день");
  }
});

it("shares released conditions while keeping sandbox state isolated", () => {
  expect(OCTOBER_COMPENDIUM_WEEKS.map((week) => week.quests.length)).toEqual([7, 7, 7]);
  expect(OCTOBER_COMPENDIUM_WEEKS[2].quests.some((quest) => quest.description.includes("здоровья"))).toBe(false);
});
