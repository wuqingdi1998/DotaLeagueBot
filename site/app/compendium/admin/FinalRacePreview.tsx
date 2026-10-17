"use client";

import { useState } from "react";
import { CompendiumStarRace } from "../components/CompendiumStarRace";
import { FINAL_RACE_PREVIEW_WEEK, finalRacePreviewData } from "./final-race-preview";

const previewRules = [
  "Победы в рейтинге или обычном All Pick. Если не указан один матч – сумма за день.",
  "Каждый день выбирайте любое из двух заданий. Награда – один раз за день. Завтра путь можно сменить.",
] as const;

function ignorePreviewAction() {}

export function FinalRacePreviewPanel({ activeDay = 0, isCompleted = false, completedPath = "core" }: {
  activeDay?: number;
  isCompleted?: boolean;
  completedPath?: "core" | "support";
}) {
  const { race, lanes, currentTimeMs } = finalRacePreviewData(activeDay, isCompleted, completedPath);
  return <CompendiumStarRace
    race={race} questLanes={lanes} currentTimeMs={currentTimeMs}
    checkingDateKey={null} canCheck={false} onCheck={ignorePreviewAction}
    isSubmittingPrediction={false} onSubmitPrediction={ignorePreviewAction}
    isPreview collapsibleRulesOnMobile rulesOverride={previewRules}
    sectionId="final-race-two-paths"
  />;
}

export function FinalRacePreview() {
  const [activeDay, setActiveDay] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedPath, setCompletedPath] = useState<"core" | "support">("core");
  return <section className="compendium-final-race-preview" id="final-race-preview">
    <h2>Тест третьей страницы · два пути в финальной неделе</h2>
    <p>Предпросмотр для организатора. Можно переключить день и посмотреть выполненные задания. Звёзды здесь не начисляются.</p>
    <div className="compendium-final-race-controls">
      <label>День гонки <select value={activeDay} onChange={(event) => setActiveDay(Number(event.target.value))}>
        {FINAL_RACE_PREVIEW_WEEK.quests.map((quest, index) => <option key={quest.dateKey} value={index}>{quest.weekday}, {quest.dateLabel}</option>)}
      </select></label>
      <label><input type="checkbox" checked={isCompleted} onChange={(event) => setIsCompleted(event.target.checked)} /> Задание дня выполнено</label>
      <label>Выполненный путь <select value={completedPath} onChange={(event) => setCompletedPath(event.target.value as "core" | "support")}>
        <option value="core">Путь кора</option><option value="support">Путь поддержки</option>
      </select></label>
    </div>
    <div className="october-compendium-screen october-compendium-screen-race october-final-race-screen">
      <div className="compendium-rewards-section"><FinalRacePreviewPanel activeDay={activeDay} isCompleted={isCompleted} completedPath={completedPath} /></div>
    </div>
  </section>;
}
