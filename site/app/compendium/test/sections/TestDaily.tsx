import { useState, type Dispatch } from "react";
import { OctoberDailyView } from "@/app/organizer/compendium-october/sections/OctoberDailyView";
import { OctoberDailyCountdownView } from "@/app/organizer/compendium-october/components/OctoberDailyCountdownView";
import { TestRune } from "./TestRune";
import { TEST_COMPENDIUM, testDayBounds } from "../model/config";
import { TEST_CLAN_ROSTERS } from "../model/roster";
import { testCompletionKey, testDailyQuests, testRerollsRemaining, testReward, type TestAction, type TestState } from "../model/state";

export function TestDaily({ state, dispatch }: { state: TestState; dispatch: Dispatch<TestAction> }) {
  const [hiddenGuides, setHiddenGuides] = useState<string[]>([]);
  const quests = testDailyQuests(state);
  const hasOuting = state.completed.includes(testCompletionKey(state.race.activeDay, "outing"));
  return <OctoberDailyView isOpen isLive rewardStars={testReward(state.race.activeDay)}
    quests={quests} dailyData={{ quests, rerollsRemaining: testRerollsRemaining(state),
      clanOuting: hasOuting ? { matchId: "", partnerPlayerId: TEST_COMPENDIUM.partnerId, partnerName: TEST_CLAN_ROSTERS.morbus[1], completedAt: testDayBounds(state.race.activeDay).start.toISOString() } : null,
    }} checkingQuestId={null} rerollingQuestId={null} isCheckingClanOuting={false} message=""
    guides={{ isVisible: (key) => !hiddenGuides.includes(key), dismiss: (key) => setHiddenGuides((keys) => [...keys, key]), restoreAll: () => setHiddenGuides([]) }}
    checkQuest={(id) => dispatch({ type: "complete", kind: quests.find((quest) => quest.id === id)?.position === 1 ? "daily-1" : "daily-2" })}
    rerollQuest={(id) => dispatch({ type: "reroll", position: quests.find((quest) => quest.id === id)?.position === 1 ? 1 : 2 })}
    checkClanOuting={() => dispatch({ type: "complete", kind: "outing" })}
    countdown={<OctoberDailyCountdownView countdown={TEST_COMPENDIUM.resetCountdown} />}
    rune={<TestRune key={`${state.race.activeDay}:${state.runeHeroId}:${state.hasRuneAccess}`} state={state} dispatch={dispatch} />}
  />;
}
