import type { ReactElement } from "react";
import { expect, it } from "vitest";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/plan";
import { octoberRacePreviewData } from "../model/preview";
import { OctoberCompendiumPreview } from "./OctoberCompendiumPreview";
import type { StarRaceData } from "@/app/compendium/model/star-race";

function raceElement(weekIndex: number, race: StarRaceData) {
  const view = OctoberCompendiumPreview({ week: OCTOBER_COMPENDIUM_WEEKS[weekIndex], clanMembers: [],
    viewerDiscordId: "transition-test", personalStars: 0, starRaceData: race });
  return view.props.race as ReactElement;
}

it("replaces stale race state when the server advances the week, date or stored path", () => {
  const second = octoberRacePreviewData(OCTOBER_COMPENDIUM_WEEKS[1]);
  const final = octoberRacePreviewData(OCTOBER_COMPENDIUM_WEEKS[2]);
  final.pathSelection = { path: null, selectedOn: null, canChoose: true };
  final.quests = [];
  const selected = { ...final, pathSelection: { path: "support" as const, selectedOn: "2026-10-19", canChoose: false },
    quests: octoberRacePreviewData(OCTOBER_COMPENDIUM_WEEKS[2]).quests.map((quest, day) => ({ ...quest, phase: day === 0 ? "active" as const : "upcoming" as const })) };
  const tomorrow = { ...selected, quests: selected.quests.map((quest, day) => ({ ...quest,
    phase: day === 1 ? "active" as const : day < 1 ? "finished" as const : "upcoming" as const })) };
  expect(new Set([raceElement(1, second), raceElement(2, final), raceElement(2, selected), raceElement(2, tomorrow)].map(({ key }) => key)).size).toBe(4);
});
