import { useState, type Dispatch } from "react";
import { compendiumHeroById } from "../../model/heroes";
import { RuneChallengeView } from "../../components/RuneChallengeView";
import { TEST_COMPENDIUM, TEST_RACE_WEEK, testDayBounds } from "../model/config";
import { testCompletionKey, testReward, type TestState, type TestAction } from "../model/state";

export function TestRune({ state, dispatch }: { state: TestState; dispatch: Dispatch<TestAction> }) {
  const [heroId, setHeroId] = useState("");
  const bounds = testDayBounds(state.race.activeDay);
  const isCompleted = state.completed.includes(testCompletionKey(state.race.activeDay, "rune"));
  return <RuneChallengeView challenge={{ hasAccess: state.hasRuneAccess, accessRoleName: null,
    selection: state.runeHeroId ? { hero: compendiumHeroById(state.runeHeroId), selectedAt: TEST_RACE_WEEK.startsAt, nextChangeAt: TEST_RACE_WEEK.endsAt, canChangeHero: false } : null,
    completion: isCompleted ? { matchedHeroId: state.runeHeroId, matchedMatchId: null, completedAt: bounds.start.toISOString(), isManual: true } : null,
  }} currentTimeMs={bounds.start.getTime()} rewardStars={testReward(state.race.activeDay)} resetCountdown={TEST_COMPENDIUM.resetCountdown}
    selectedHeroId={heroId} setSelectedHeroId={setHeroId} isSaving={false} isChecking={false} message=""
    saveHero={() => dispatch({ type: "rune-hero", heroId: Number(heroId) })}
    checkWin={() => dispatch({ type: "complete", kind: "rune" })} />;
}
