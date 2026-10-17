import type { Dispatch } from "react";
import { QuestCard } from "../../components/QuestCard";
import { TestRune } from "./TestRune";
import { testCompletionKey, testDailyQuests, testRerollsRemaining, testReward, type TestAction, type TestState } from "../model/state";

export function TestDaily({ state, dispatch }: { state: TestState; dispatch: Dispatch<TestAction> }) {
  const reward = testReward(state.race.activeDay);
  const rerolls = testRerollsRemaining(state);
  const hasOuting = state.completed.includes(testCompletionKey(state.race.activeDay, "outing"));
  return <section className="compendium-daily-section october-daily-section--compact-guidance">
    <div className="october-daily-toolbar"><div className="compendium-section-heading"><h2>Задания дня</h2></div>
      {reward === 2 && <div className="compendium-weekend-bonus"><span>Бонус выходного дня</span><strong>Х2</strong></div>}
    </div>
    <div className="october-daily-challenges"><div className="compendium-quest-grid quest-count-3">
      {testDailyQuests(state).map((quest) => <QuestCard key={quest.id} quest={quest} rewardStars={reward} isChecking={false} isRerolling={false} canCheck hasReroll={rerolls > 0} rerollsRemaining={rerolls} canReroll={rerolls > 0}
        onCheck={() => dispatch({ type: "complete", kind: quest.position === 1 ? "daily-1" : "daily-2" })}
        onReroll={() => dispatch({ type: "reroll", position: quest.position === 1 ? 1 : 2 })}
      />)}
      <article className="compendium-quest october-clan-quest">
        <div className="compendium-quest-heading"><h2>Испытание 3</h2><strong className="compendium-reward">★ {reward}</strong></div>
        <div className="october-clan-quest-emblem" aria-hidden="true">⚔</div><h3>Клановая вылазка</h3><p className="compendium-condition">Выиграйте матч вместе с участником своего клана.</p>
        <p className="october-clan-quest-note">В тесте звёзды получат вы и тестовый напарник.</p>
        {hasOuting ? <div className="compendium-completion" role="status">Вылазка выполнена (тест)</div> : <button className="compendium-check-button" type="button" onClick={() => dispatch({ type: "complete", kind: "outing" })}>Выполнить вылазку (тест)</button>}
      </article>
    </div><TestRune key={`${state.race.activeDay}:${state.runeHeroId}:${state.hasRuneAccess}`} state={state} dispatch={dispatch} /></div>
  </section>;
}
