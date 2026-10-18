import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { OctoberRacePreview } from "@/app/organizer/compendium-october/sections/OctoberActivityPreview";
import { OCTOBER_COMPENDIUM_WEEKS } from "@/app/organizer/compendium-october/model/plan";
import { FinalRacePreviewPanel } from "@/app/compendium/admin/FinalRacePreview";
import { finalRacePreviewData, type FinalRacePreviewState } from "@/app/compendium/admin/final-race-preview";
import { octoberRacePreviewData } from "@/app/organizer/compendium-october/model/preview";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function normalizeTestControls(html: string) {
  return html.replace(/(<section class="compendium-star-race" id=")[^"]+/, "$1race-parity")
    .replace(/>Выполнить \(тест\)</g, ">Проверить<")
    .replace(/<a\b[^>]*class="compendium-star-race-counter"[^>]*>/g, (opening) => opening.replace(/\s(?:href|aria-disabled)="[^"]*"/g, ""));
}

const scenarios = (["core", "support"] as const).flatMap((path) => Array.from({ length: 7 }, (_, activeDay) => activeDay).flatMap((activeDay) => [false, true].map((isCompleted) => ({
  path, activeDay, completedDays: Array.from({ length: activeDay + (isCompleted ? 1 : 0) }, (_, day) => day),
}))));

it.each(scenarios)("preserves the actual main race markup for $path day $activeDay ($completedDays)", (state: FinalRacePreviewState) => {
  const preview = finalRacePreviewData(state)!;
  const main = renderToStaticMarkup(<OctoberRacePreview week={OCTOBER_COMPENDIUM_WEEKS[2]} initialRace={preview.race} serverNow={new Date(preview.currentTimeMs).toISOString()} />);
  const test = renderToStaticMarkup(<FinalRacePreviewPanel state={state} />);
  expect(normalizeTestControls(test)).toBe(normalizeTestControls(main));
});

it.each(["core", "support"] as const)("uses unchanged main third-week conditions for %s", (path) => {
  const week = OCTOBER_COMPENDIUM_WEEKS[2];
  const main = renderToStaticMarkup(<OctoberRacePreview week={week} initialRace={octoberRacePreviewData(week)} />);
  const test = renderToStaticMarkup(<FinalRacePreviewPanel state={{ path, activeDay: 0, completedDays: [] }} />);
  const ruleLists = (html: string) => [...html.matchAll(/class="compendium-star-race-rules[^"]*"[\s\S]*?(<ul>[\s\S]*?<\/ul>)/g)].map((match) => match[1]);
  expect(ruleLists(main)).toHaveLength(2);
  expect(ruleLists(test)).toEqual(ruleLists(main));
});
