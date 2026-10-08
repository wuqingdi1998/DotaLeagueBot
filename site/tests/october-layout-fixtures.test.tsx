import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { OctoberDailyPreview, OctoberRacePreview } from "@/app/organizer/compendium-october/sections/OctoberActivityPreview";
import { octoberDailyQuestSamples, octoberRacePreviewData } from "@/app/organizer/compendium-october/model/preview";
import { OCTOBER_COMPENDIUM_WEEKS } from "@/app/organizer/compendium-october/model/plan";
import type { RuneChallengeData } from "@/app/compendium/model/types";

const guidance = vi.hoisted(() => ({ isVisible: false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/organizer/compendium-october/hooks/useOctoberGuideVisibility", () => ({
  useOctoberGuideVisibility: () => ({ isVisible: () => guidance.isVisible, dismiss: vi.fn(), restoreAll: vi.fn() }),
}));

it("renders live layout scenarios with progress, timers, completed tasks and rune controls", () => {
  const directory = new URL("../.data/october-layout/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const styles = new URL("../app/styles/", import.meta.url);
  const styleNames = ["01-foundation.css", ...[...readFileSync(new URL("compendium-route.css", styles), "utf8").matchAll(/@import "\.\/(.*?)";/g)].map((match) => match[1])];
  const css = styleNames.map((name) => readFileSync(new URL(name, styles), "utf8")).join("\n");
  const fixtures: string[] = [];
  function save(name: string, screen: string, html: string) {
    fixtures.push(name);
    writeFileSync(new URL(`${name}.html`, directory), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div class="site-shell" data-theme="dark"><div style="height:76px"></div><main class="compendium-page october-compendium-preview"><section class="october-compendium-screen october-compendium-screen-${screen}">${html}</section></main></div>`);
  }

  for (const [weekIndex, week] of OCTOBER_COMPENDIUM_WEEKS.entries()) {
    for (let activeDay = 0; activeDay < week.quests.length; activeDay++) {
      const race = octoberRacePreviewData(week);
      race.phase = "active";
      race.personalStars = 15;
      race.personalRank = 2;
      race.quests = race.quests.map((quest, day) => ({
        ...quest, phase: day === activeDay ? "active" : day < activeDay ? "finished" : "upcoming",
        progress: quest.requirement?.kind === "cumulative-ranked-win-stat" ? { current: 0, target: quest.requirement.target, checkedAt: null }
          : quest.requirement?.kind === "winning-building-damage" ? { current: day < activeDay ? 17407 : 0, target: quest.requirement.targetDamage, checkedAt: null }
          : quest.requirement?.kind === "ranked-wins" ? { current: day < activeDay ? quest.requirement.requiredWins : 0, target: quest.requirement.requiredWins, checkedAt: null } : null,
        completion: day < activeDay ? { completedAt: quest.endsAt, wins: quest.heroes.slice(0, 2).map((hero) => ({ hero, matchId: "9035544919" })), isManual: false } : null,
      }));
      const serverNow = new Date(Date.parse(race.quests[activeDay].startsAt) + 60_000).toISOString();
      save(`race-${weekIndex}-${activeDay}`, "race", renderToStaticMarkup(<div className="compendium-rewards-section"><OctoberRacePreview week={week} initialRace={race} serverNow={serverNow} /></div>));
    }
  }

  for (const hasGuidance of [false, true]) {
    guidance.isVisible = hasGuidance;
    for (const state of ["open", "completed", "selection", "change", "locked"]) {
      const quests = octoberDailyQuestSamples();
      const serverNow = "2026-10-09T12:00:00Z";
      const completion = { matchedHeroId: quests[0].heroes[0].id, matchedMatchId: "9035544919", completedAt: serverNow, isManual: false };
      const runeChallenge: RuneChallengeData = {
        hasAccess: state !== "locked", accessRoleName: null,
        selection: state === "selection" || state === "locked" ? null : {
          hero: quests[0].heroes[0], selectedAt: serverNow,
          nextChangeAt: state === "change" ? "2026-10-08T12:00:00Z" : "2026-10-16T12:00:00Z", canChangeHero: state === "change",
        }, completion: state === "completed" ? completion : null,
      };
      save(`daily-${state}-${hasGuidance ? "guidance" : "compact"}`, "daily", renderToStaticMarkup(<OctoberDailyPreview viewerDiscordId="layout-test" rewardStars={2} serverNow={serverNow} initialData={{
        quests: quests.map((quest) => ({ ...quest, completion: state === "completed" ? completion : null })), rerollsRemaining: 3,
        clanOuting: state === "completed" ? { matchId: "9035544919", partnerPlayerId: "test", partnerName: "cravzen", completedAt: serverNow } : null,
        runeChallenge,
      }} />));
    }
  }
  writeFileSync(new URL("manifest.json", directory), JSON.stringify(fixtures));
  expect(fixtures).toHaveLength(31);
});
