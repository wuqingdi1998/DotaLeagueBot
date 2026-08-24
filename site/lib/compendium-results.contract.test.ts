import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const header = source("../app/components/SiteHeader.tsx");
const legacyPage = source("../app/compendium/page.tsx");
const organizerPage = source("../app/organizer/page.tsx");
const resultsPage = source("../app/compendium/results/page.tsx");
const resultsRepository = source(
  "../app/compendium/services/results-repository.ts",
);
const resultsView = source(
  "../app/compendium/sections/CompendiumResults.tsx",
);
const resultsCss = source("../app/styles/57-compendium-results.css");

describe("finished compendium results contract", () => {
  it("keeps the full compendium behind the organizer menu", () => {
    expect(header).toContain("Меню организатора");
    expect(header).toContain('href="/organizer"');
    expect(header).toContain("user?.isAdmin");
    expect(organizerPage).toContain("if (!user?.isAdmin) notFound()");
    expect(organizerPage).toContain("<CompendiumDashboard");
    expect(legacyPage).toContain('redirect("/compendium/results")');
  });

  it("loads public results and optional personal progress", () => {
    expect(resultsPage).toContain("getSession()");
    expect(resultsPage).toContain("loadCompendiumResults(user?.discordId)");
    expect(resultsRepository).toContain("loadCompendiumLeaderboard()");
    expect(resultsRepository).toContain("STAR_RACE_WEEKS.map");
    expect(resultsRepository).toContain("compendium_user_quest_completions");
    expect(resultsRepository).toContain(
      "compendium_star_race_quest_completions",
    );
    expect(resultsRepository).toContain("compendium_prediction_rewards");
  });

  it("shows the requested community, personal, and race summaries", () => {
    expect(resultsView).toContain("Итоги сообщества");
    expect(resultsView).toContain("Топ-10 Компендиума");
    expect(resultsView).toContain("Ваш личный результат");
    expect(resultsView).toContain("Ежедневные испытания");
    expect(resultsView).toContain("Задания гонки");
    expect(resultsView).toContain("Прогнозы матчей");
    expect(resultsView).toContain("Топ-5");
    expect(resultsView).toContain("is-current-player");
  });

  it("adapts the result layout for phones", () => {
    expect(resultsCss).toContain("@media (max-width: 720px)");
    expect(resultsCss).toContain(".compendium-results-races");
  });
});
