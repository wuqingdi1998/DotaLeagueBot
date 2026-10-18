"use client";

import { useReducer } from "react";
import { CompendiumStarRace } from "../components/CompendiumStarRace";
import { FinalRacePathChoice } from "./FinalRacePathChoice";
import { OCTOBER_RACE_EXCLUSION_RULES } from "@/app/organizer/compendium-october/model/preview";
import { FINAL_RACE_PATH_RULES, FINAL_RACE_PREVIEW_WEEK, INITIAL_FINAL_RACE_PREVIEW, finalRacePreviewData, finalRacePreviewReducer, type FinalRacePreviewState, type FinalRacePath } from "./final-race-preview";

function ignorePreviewAction() {}

export function FinalRacePreviewPanel({ state = INITIAL_FINAL_RACE_PREVIEW, onChoosePath = ignorePreviewAction, onCompleteQuest = ignorePreviewAction, personalStars }: {
  state?: FinalRacePreviewState;
  onChoosePath?: (path: FinalRacePath) => void;
  onCompleteQuest?: (dateKey: string) => void;
  personalStars?: number;
}) {
  const preview = finalRacePreviewData(state);
  if (!preview) return <FinalRacePathChoice onChoosePath={onChoosePath} />;
  const { race, currentTimeMs } = preview;
  return <CompendiumStarRace
    race={{ ...race, personalStars: personalStars ?? race.personalStars }} currentTimeMs={currentTimeMs}
    checkingDateKey={null} canCheck onCheck={onCompleteQuest} checkButtonLabel="Выполнить (тест)"
    isSubmittingPrediction={false} onSubmitPrediction={ignorePreviewAction}
    collapsibleRulesOnMobile exclusionRules={[...OCTOBER_RACE_EXCLUSION_RULES, ...FINAL_RACE_PATH_RULES]} standingsHref={null}
    sectionId="final-race-two-paths"
  />;
}

export function FinalRacePreview() {
  const [state, dispatch] = useReducer(finalRacePreviewReducer, INITIAL_FINAL_RACE_PREVIEW);
  return <section className="compendium-final-race-preview" id="final-race-preview">
    <h2>Тест третьей страницы · выбор пути на неделю</h2>
    <p>Выбирайте путь, переключайте дни и выполняйте задания по кнопке. Здесь начисляются только тестовые звёзды. Сброс очищает выбор и результаты этой тестовой недели.</p>
    <div className="compendium-final-race-controls">
      <label>День гонки <select value={state.activeDay} disabled={state.path === null} onChange={(event) => dispatch({ type: "set-day", day: Number(event.target.value) })}>
        {FINAL_RACE_PREVIEW_WEEK.quests.map((quest, index) => <option key={quest.dateKey} value={index}>{quest.weekday}, {quest.dateLabel}</option>)}
      </select></label>
      <button type="button" disabled={state.path === null || state.activeDay === FINAL_RACE_PREVIEW_WEEK.quests.length - 1} onClick={() => dispatch({ type: "set-day", day: state.activeDay + 1 })}>Следующий день</button>
      <button type="button" onClick={() => dispatch({ type: "reset" })}>Сбросить тестовую неделю</button>
      <span role="status">{state.path === null ? "Путь ещё не выбран" : `Выбрано: ${state.path === "core" ? "Разрушение" : "Созидание"}. Изменить путь можно после сброса.`}</span>
    </div>
    <div className="october-compendium-screen october-compendium-screen-race">
      <div className="compendium-rewards-section"><FinalRacePreviewPanel state={state}
        onChoosePath={(path) => dispatch({ type: "choose-path", path })}
        onCompleteQuest={(dateKey) => dispatch({ type: "complete", dateKey })}
      /></div>
    </div>
  </section>;
}
