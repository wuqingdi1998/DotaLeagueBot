import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("local computer time hint contract", () => {
  it("enables one automatic enhancer for the whole site", () => {
    const layout = source("app/layout.tsx");
    const enhancer = source("app/components/LocalTimeHints.tsx");
    expect(layout).toContain("<LocalTimeHints />");
    expect(enhancer).toContain('time[datetime]');
    expect(enhancer).toContain("MutationObserver");
    expect(enhancer).toContain("element.title = hint");
  });

  it("marks tournament, season, and compendium times semantically", () => {
    const matches = source(
      "app/tournaments/[slug]/sections/MatchesPanel.tsx",
    );
    const season = source(
      "app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
    );
    const predictions = source(
      "app/compendium/components/CompendiumPredictions.tsx",
    );
    expect(matches).toContain("dateTime={match.scheduled_at}");
    expect(season).toContain("dateTime={round.registration_deadline}");
    expect(predictions).toContain("dateTime={match.startsAt}");
    expect(predictions).toContain("dateTime={match.opensAt}");
  });

  it("marks recurring Moscow times for local conversion", () => {
    const dashboard = source(
      "app/compendium/sections/CompendiumDashboard.tsx",
    );
    const rerollNotice = source(
      "app/compendium/components/DailyRerollNotice.tsx",
    );
    expect(dashboard).toContain("data-moscow-recurring-time");
    expect(rerollNotice).toContain("data-moscow-recurring-time");
  });
});
