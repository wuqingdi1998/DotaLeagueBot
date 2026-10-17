import type { Dispatch } from "react";
import { TEST_RACE_WEEK, TEST_SECTIONS, TEST_COMPENDIUM } from "../model/config";
import { testTotals, type TestAction, type TestState } from "../model/state";

export function TestToolbar({ state, dispatch, activeId, onOpen }: { state: TestState; dispatch: Dispatch<TestAction>; activeId: string; onOpen: (id: string) => void }) {
  return <header className="compendium-test-toolbar">
    <div className="compendium-test-toolbar-top"><strong>Компендиум · ТЕСТ</strong><nav aria-label="Разделы тестового компендиума">{TEST_SECTIONS.map((section) => <button type="button" key={section.id} aria-current={activeId === section.id ? "page" : undefined} onClick={() => onOpen(section.id)}>{section.label}</button>)}</nav><span data-testid="test-total">★ {testTotals(state).personal}</span></div>
    <div className="compendium-test-controls"><label>День <select aria-label="День теста" value={state.race.activeDay} disabled={state.race.path === null} onChange={(event) => dispatch({ type: "race", action: { type: "set-day", day: Number(event.target.value) } })}>{TEST_RACE_WEEK.quests.map((quest, index) => <option key={quest.dateKey} value={index}>{quest.weekday}, {quest.dateLabel}</option>)}</select></label>
      <button type="button" onClick={() => dispatch({ type: "bonus" })}>+{TEST_COMPENDIUM.bonusStars} тестовых звёзд</button>
      <button type="button" onClick={() => dispatch({ type: "reset" })}>Сбросить тест</button>
      <span>Основа не затрагивается</span>
    </div>
  </header>;
}
