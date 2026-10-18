import { mkdirSync, writeFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { ImageConfigContext } from "next/dist/shared/lib/image-config-context.shared-runtime";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import nextConfig from "@/next.config";
import { expect, it, vi } from "vitest";
import { OctoberCompendiumView } from "@/app/organizer/compendium-october/sections/OctoberCompendiumView";
import { OctoberClanShowcase } from "@/app/organizer/compendium-october/sections/OctoberClanShowcase";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { octoberRewardsForStars } from "@/app/organizer/compendium-october/model/rewards";
import { FinalRacePreviewPanel } from "@/app/compendium/admin/FinalRacePreview";
import { OctoberDailyPreview } from "@/app/organizer/compendium-october/sections/OctoberActivityPreview";
import { TestCompendium } from "@/app/compendium/test/sections/TestCompendium";
import { TestDaily } from "@/app/compendium/test/sections/TestDaily";
import { TestToolbar } from "@/app/compendium/test/components/TestToolbar";
import { TEST_COMPENDIUM, TEST_RACE_WEEK, testDayBounds } from "@/app/compendium/test/model/config";
import { INITIAL_TEST_STATE, testDailyQuests, testReducer, testRerollsRemaining, testReward, testTotals, type TestState } from "@/app/compendium/test/model/state";
import { testMembers } from "@/app/compendium/test/model/presentation";
import { testClanActivity } from "@/app/compendium/test/model/activity";
import { TEST_CLAN_ROSTERS } from "@/app/compendium/test/model/roster";
import { compendiumHeroById } from "@/app/compendium/model/heroes";
import type { OctoberDailyQuestData } from "@/app/organizer/compendium-october/services/october-daily-quests";

const fixture = vi.hoisted(() => ({ activity: null as unknown }));
function render(node: ReactNode) {
  return renderToString(<ImageConfigContext.Provider value={{ ...imageConfigDefault, ...nextConfig.images }}>{node}</ImageConfigContext.Provider>);
}
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/organizer/compendium-october/hooks/useClanActivity", () => ({
  useClanActivity: () => ({ activity: fixture.activity, error: null, retry: vi.fn() }),
}));

// Feed the real main controller synthetic records; never load working player data.
function mainDailyData(state: TestState): OctoberDailyQuestData {
  const day = state.race.activeDay;
  const completedAt = testDayBounds(day).start.toISOString();
  return {
    quests: testDailyQuests(state), rerollsRemaining: testRerollsRemaining(state),
    clanOuting: state.completed.includes(`${day}:outing`) ? {
      matchId: "", partnerPlayerId: TEST_COMPENDIUM.partnerId, partnerName: TEST_CLAN_ROSTERS.morbus[1], completedAt,
    } : null,
    runeChallenge: { hasAccess: state.hasRuneAccess, accessRoleName: null,
      selection: state.runeHeroId ? { hero: compendiumHeroById(state.runeHeroId), selectedAt: TEST_RACE_WEEK.startsAt, nextChangeAt: TEST_RACE_WEEK.endsAt, canChangeHero: false } : null,
      completion: state.completed.includes(`${day}:rune`) ? { matchedHeroId: state.runeHeroId, matchedMatchId: null, completedAt, isManual: true } : null,
    },
  };
}

function serverNow(state: TestState) {
  return new Date(testDayBounds(state.race.activeDay).start.getTime() + 12 * 60 * 60 * 1000).toISOString();
}

const chosen = testReducer(INITIAL_TEST_STATE, { type: "race", action: { type: "choose-path", path: "support" } });
const selected = testReducer(chosen, { type: "rune-hero", heroId: 1 });
const completed = (["daily-1", "daily-2", "outing", "rune"] as const).reduce((state, kind) => testReducer(state, { type: "complete", kind }), selected);
const cases: Record<string, TestState> = {
  initial: INITIAL_TEST_STATE, selected, completed,
  friday: testReducer(selected, { type: "race", action: { type: "set-day", day: 4 } }),
  saturday: testReducer(completed, { type: "race", action: { type: "set-day", day: 5 } }),
  sunday: testReducer(selected, { type: "race", action: { type: "set-day", day: 6 } }),
  locked: testReducer(chosen, { type: "rune-access", hasAccess: false }),
  rerolled: testReducer({ ...selected, bonus: 120 }, { type: "reroll", position: 1 }),
};

it.each(Object.entries(cases))("renders exactly the main daily HTML for %s", (_name, state) => {
  const main = render(<OctoberDailyPreview viewerDiscordId="synthetic-parity-player" initialData={mainDailyData(state)} rewardStars={testReward(state.race.activeDay)} serverNow={serverNow(state)} />);
  const test = render(<TestDaily state={state} dispatch={() => {}} />);
  expect(test).toBe(main);
});

it.each(Object.entries(cases))("writes independent main and test renders for %s", (name, state) => {
  const directory = new URL("../.data/compendium-parity/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  fixture.activity = testClanActivity(state);
  // The fixture gives both documents identical test controls outside the compared content.
  const main = render(<div className="site-shell platform-shell" data-theme="dark"><TestToolbar state={state} dispatch={() => {}} activeId="test-clans" onOpen={() => {}} />
    <OctoberCompendiumView navigation={null} isFinalRace
      clans={<OctoberClanShowcase members={testMembers(state)} viewerDiscordId={TEST_COMPENDIUM.playerId} />}
      rewards={<CompendiumRewards personalStars={testTotals(state).personal} communityStars={0} isPreview showCommunity={false} personalRewards={octoberRewardsForStars(testTotals(state).personal)} />}
      // Both references include the explicitly requested new race. On mobile its height also
      // affects the continuous background of the other screens; do not replace that background.
      race={<FinalRacePreviewPanel state={state.race} personalStars={testTotals(state).weekly} onChoosePath={() => {}} onCompleteQuest={() => {}} />}
      daily={<OctoberDailyPreview viewerDiscordId={TEST_COMPENDIUM.playerId} initialData={mainDailyData(state)} rewardStars={testReward(state.race.activeDay)} serverNow={serverNow(state)} />}
    />
  </div>);
  const test = render(<TestCompendium initialState={state} />);
  writeFileSync(new URL(`${name}.json`, directory), JSON.stringify({ main, test }));
  writeFileSync(new URL("manifest.json", directory), JSON.stringify(Object.keys(cases)));
});
