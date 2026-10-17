import { useState, type Dispatch } from "react";
import { COMPENDIUM_HEROES, compendiumHeroById } from "../../model/heroes";
import { HeroChoice } from "../../components/HeroChoice";
import { testCompletionKey, testReward, type TestState, type TestAction } from "../model/state";

export function TestRune({ state, dispatch }: { state: TestState; dispatch: Dispatch<TestAction> }) {
  const [heroId, setHeroId] = useState("");
  const isCompleted = state.completed.includes(testCompletionKey(state.race.activeDay, "rune"));
  return <section className="compendium-rune-challenge">
    <div className="compendium-rune-heading"><h2>Испытание Рун</h2><strong className="compendium-reward">★ {testReward(state.race.activeDay)}</strong></div>
    <label className="compendium-test-rune-access"><input type="checkbox" checked={state.hasRuneAccess} onChange={(event) => dispatch({ type: "rune-access", hasAccess: event.target.checked })} /> Доступ к рунам (тест)</label>
    {!state.hasRuneAccess ? <div className="compendium-rune-locked-message">Испытание открывается подписчикам. В тесте доступ включается переключателем выше.</div> : <div className="compendium-rune-content">
      {state.runeHeroId ? <div className="compendium-rune-selected-hero"><HeroChoice hero={compendiumHeroById(state.runeHeroId)} isMatched={isCompleted} /><div><span>Ваш любимый герой</span><strong>{compendiumHeroById(state.runeHeroId).name}</strong></div></div> : <p>Выберите героя на тестовую неделю.</p>}
      <div className="compendium-rune-action"><p>Победите в рейтинговом или обычном All Pick матче на выбранном герое. Выполнение доступно ежедневно.</p>
        {isCompleted ? <div className="compendium-completion" role="status">Испытание выполнено (тест)</div> : state.runeHeroId && <button className="compendium-check-button" type="button" onClick={() => dispatch({ type: "complete", kind: "rune" })}>Выполнить руны (тест)</button>}
      </div>
      <div className="compendium-rune-picker"><label><span>Любимый герой (тест)</span><select value={heroId} onChange={(event) => setHeroId(event.target.value)}><option value="">Выберите героя</option>{[...COMPENDIUM_HEROES].sort((a, b) => a.name.localeCompare(b.name, "en")).map((hero) => <option key={hero.id} value={hero.id}>{hero.name}</option>)}</select></label>
        <button type="button" disabled={!heroId} onClick={() => dispatch({ type: "rune-hero", heroId: Number(heroId) })}>{state.runeHeroId ? "Сменить героя (тест)" : "Выбрать героя (тест)"}</button>
      </div>
    </div>}
  </section>;
}
