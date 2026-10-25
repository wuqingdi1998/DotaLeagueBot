import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CompendiumResults } from "../sections/CompendiumResults";
import type { CompendiumResultsData } from "./results";

const data: CompendiumResultsData = {
  communityStars: 1624,
  isFinished: true,
  closure: "finished",
  leaders: [],
  races: [],
  personal: {
    totalStars: 93,
    dailyQuestStars: 43,
    starRaceStars: 34,
    predictionStars: 0,
    tournamentParticipationStars: 16,
    otherStars: 0,
  },
};

it("shows only the four actual October star sources and preserves their values", () => {
  const html = renderToStaticMarkup(<CompendiumResults data={{ ...data, period: "october" }} />);
  expect(html).not.toContain("прогноз");
  const personal = html.match(/<div class="compendium-personal-results">([\s\S]*?)<\/div>/)?.[1] ?? "";
  expect(personal.match(/<article/g)).toHaveLength(4);
  for (const value of [93, 43, 34, 16]) expect(personal).toContain(String(value));
  expect(html).toContain("compendium-results-page--compact");
  expect(html.match(/<td>/g)).toHaveLength(90);
});

it("keeps prediction results and the original layout for the historical TI event", () => {
  const html = renderToStaticMarkup(<CompendiumResults data={{ ...data, period: "ti-2026" }} />);
  expect(html).toContain("Звёзд за прогнозы матчей");
  const personal = html.match(/<div class="compendium-personal-results">([\s\S]*?)<\/div>/)?.[1] ?? "";
  expect(personal.match(/<article/g)).toHaveLength(5);
  expect(html).not.toContain("compendium-results-page--compact");
  expect(html).not.toContain("Результаты розыгрыша");
});
