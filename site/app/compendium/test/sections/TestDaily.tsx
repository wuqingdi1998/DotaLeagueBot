import { useState, type Dispatch } from "react";
import { FiInfo, FiX } from "react-icons/fi";
import { QuestCard } from "../../components/QuestCard";
import { DailyResetCountdown } from "../../components/DailyResetCountdown";
import { OctoberClanOutingCard } from "@/app/organizer/compendium-october/sections/OctoberClanOutingCard";
import { TestRune } from "./TestRune";
import { TEST_COMPENDIUM, testDayBounds } from "../model/config";
import { TEST_CLAN_ROSTERS } from "../model/roster";
import { testCompletionKey, testDailyQuests, testRerollsRemaining, testReward, type TestAction, type TestState } from "../model/state";

export function TestDaily({ state, dispatch }: { state: TestState; dispatch: Dispatch<TestAction> }) {
  const [isOverviewVisible, setIsOverviewVisible] = useState(true);
  const [isOutingNoteVisible, setIsOutingNoteVisible] = useState(true);
  const reward = testReward(state.race.activeDay);
  const rerolls = testRerollsRemaining(state);
  const hasOuting = state.completed.includes(testCompletionKey(state.race.activeDay, "outing"));
  return <section className={`compendium-daily-section october-daily-section--${isOverviewVisible ? "expanded" : "compact"}-guidance`}>
    <div className="october-daily-toolbar"><div className="compendium-section-heading october-daily-heading"><div className="october-daily-heading-row"><h2>Задания дня</h2>
      <button className="october-guide-restore" type="button" aria-label="Вернуть пояснения к заданиям" onClick={() => { setIsOverviewVisible(true); setIsOutingNoteVisible(true); }}><FiInfo aria-hidden="true" /></button>
    </div></div><div className="compendium-section-status">
      {reward === 2 && <div className="compendium-weekend-bonus"><span>Бонус выходного дня</span><strong>Х2</strong></div>}
      <div className="october-daily-countdown"><DailyResetCountdown countdown={TEST_COMPENDIUM.resetCountdown} label="До обновления испытаний" /><p>Испытания 1, 2, 3 и Рун обновляются ежедневно в 00:00 МСК</p></div>
    </div></div>
    {isOverviewVisible && <div className="october-compendium-example-note october-dismissible-guide"><p>Ежедневно – 2 испытания по 6 героев и клановая вылазка. С пятницы по воскресенье задания и Испытание Рун дают по две звезды. После {TEST_COMPENDIUM.firstReroll} личных звёзд доступны две замены заданий в день, после {TEST_COMPENDIUM.secondReroll} – три.</p>
      <button type="button" aria-label="Скрыть пояснение к заданиям дня" onClick={() => setIsOverviewVisible(false)}><FiX aria-hidden="true" /></button></div>}
    <div className="october-daily-challenges"><div className="compendium-quest-grid quest-count-3">
      {testDailyQuests(state).map((quest) => <QuestCard key={quest.id} quest={quest} rewardStars={reward} isChecking={false} isRerolling={false} canCheck hasReroll={rerolls > 0} rerollsRemaining={rerolls} canReroll={rerolls > 0}
        onCheck={() => dispatch({ type: "complete", kind: quest.position === 1 ? "daily-1" : "daily-2" })}
        onReroll={() => dispatch({ type: "reroll", position: quest.position === 1 ? 1 : 2 })}
      />)}
      <OctoberClanOutingCard rewardStars={reward} isNoteVisible={isOutingNoteVisible} onDismissNote={() => setIsOutingNoteVisible(false)} canCheck
        onCheck={() => dispatch({ type: "complete", kind: "outing" })}
        completion={hasOuting ? { matchId: "", partnerPlayerId: TEST_COMPENDIUM.partnerId, partnerName: TEST_CLAN_ROSTERS.morbus[1], completedAt: testDayBounds(state.race.activeDay).start.toISOString() } : null} />
    </div><TestRune key={`${state.race.activeDay}:${state.runeHeroId}:${state.hasRuneAccess}`} state={state} dispatch={dispatch} /></div>
  </section>;
}
