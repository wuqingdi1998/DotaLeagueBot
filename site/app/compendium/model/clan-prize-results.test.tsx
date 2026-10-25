import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { OCTOBER_CLAN_PRIZES } from "@/app/organizer/compendium-october/model/clan-prizes";
import { CompendiumClanPrizeResults } from "../sections/CompendiumClanPrizeResults";
import { CompendiumResults } from "../sections/CompendiumResults";
import { OCTOBER_CLAN_PRIZE_RESULTS } from "./clan-prize-results";

it("assigns all 30 prize slots once to the recipients specified by the organizer", () => {
  const [winners, runnersUp] = OCTOBER_CLAN_PRIZE_RESULTS;
  expect(winners.clan.id).toBe("panacea");
  expect(runnersUp.clan.id).toBe("morbus");
  expect(winners.prizes.map((prize) => [prize.name, prize.recipientName])).toEqual([
    ["Shattered Greatsword", "confuse~"],
    ["Auspicious Scythe of Vyse", ".Purvs"],
    ["Undying Love", "Sinister=)"],
    ["Magus Mimicry", "Sanraizu"],
    ["Snailfire", "aura"],
    ["Steam Gift Card на 500 ₽", "1lynya<3"],
    ["Steam Gift Card на 500 ₽", "frokeng"],
    ["Frostmoot", "Gavr"],
    ["Almond the Frondillo", "dravzen"],
    ["The Igneous Stone", "AlaStoR"],
    ["Altar Ball", "cy119"],
    ["Aberrant Observer", "humblegod"],
    ["The Lightning Orchid", "greencat"],
    ["Golden Fortune's Tout", "sobriety"],
    ["Steam Gift Card на 100 ₽", "Fayde"],
    ["Steam Gift Card на 100 ₽", "#яхочуумереть"],
    ["Steam Gift Card на 100 ₽", "ДЕД_ЕСЕНИН"],
    ["Steam Gift Card на 100 ₽", "N4ZE"],
    ["Steam Gift Card на 100 ₽", "MirrorShard"],
    ["Steam Gift Card на 100 ₽", "Pohs"],
    ["Steam Gift Card на 100 ₽", "Ame's bastard"],
  ]);
  expect(runnersUp.prizes.map((prize) => [prize.name, prize.recipientName])).toEqual([
    ["Doll of the Dead", "Gary"],
    ["Steam Gift Card на 500 ₽", "seabain"],
    ["Mantle of the Cinder Baron", "ls~"],
    ["Golden Bloodfeather Feast", "TeMan"],
    ["Steam Gift Card на 100 ₽", "chep"],
    ["Steam Gift Card на 100 ₽", "Pancake"],
    ["Steam Gift Card на 100 ₽", "GOLDEN PAPI"],
    ["Steam Gift Card на 100 ₽", "lavchik"],
    ["Golden Deepshock Destroyer", "Mazadox"],
  ]);
  const ids = OCTOBER_CLAN_PRIZE_RESULTS.flatMap((draw) => draw.prizes.map((prize) => prize.id));
  expect(ids.sort()).toEqual(OCTOBER_CLAN_PRIZES.map((prize) => prize.id).sort());
  expect(new Set(ids).size).toBe(30);
});

it("renders both clan draws with all recipients and safely escaped nicknames", () => {
  const html = renderToStaticMarkup(<CompendiumClanPrizeResults />);
  expect(html).toContain('aria-label="Призы клана Панацея"');
  expect(html).toContain('aria-label="Призы клана Морбус"');
  expect(html).toContain("Призов: 21");
  expect(html).toContain("Призов: 9");
  expect(html.match(/<tbody>/g)).toHaveLength(3);
  expect(html.match(/<td>/g)).toHaveLength(90);
  expect(html).toContain("1lynya&lt;3");
  expect(html).toContain("Ame&#x27;s bastard");
  expect(html).toContain("#яхочуумереть");
  expect(html).not.toContain("Выдан");
});

it("publishes clan prize recipients only on October results, leaving the TI archive unchanged", () => {
  const data = { communityStars: 0, leaders: [], personal: null, races: [] };
  const october = renderToStaticMarkup(<CompendiumResults data={{ ...data, period: "october" }} />);
  const archive = renderToStaticMarkup(<CompendiumResults data={{ ...data, period: "ti-2026" }} />);
  expect(october).toContain("Результаты розыгрыша");
  expect(october).toContain("Mazadox");
  expect(archive).not.toContain("Результаты розыгрыша");
  expect(archive).not.toContain("Mazadox");
});
