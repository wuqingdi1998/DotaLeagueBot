"use client";

import { useState } from "react";
import { FiCheck, FiClock, FiLoader } from "react-icons/fi";
import type { StarRaceQuest } from "../model/star-race";

export function StarRaceFinalPrediction({
  quest,
  isSubmitting,
  canSubmit,
  onSubmit,
}: {
  quest: StarRaceQuest;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: (position: number) => void;
}) {
  const prediction = quest.finalPrediction;
  const [position, setPosition] = useState(prediction?.selectedPosition ?? 0);
  if (!prediction?.teams.length) {
    return <span className="compendium-star-race-status">Организатор ещё не добавил команды</span>;
  }
  const selectedTeam = prediction.selectedPosition
    ? prediction.teams[prediction.selectedPosition - 1]
    : null;
  const winnerTeam = prediction.winnerPosition
    ? prediction.teams[prediction.winnerPosition - 1]
    : null;

  if (quest.completion) {
    return (
      <div className="compendium-star-race-completion" role="status">
        <FiCheck aria-hidden="true" />
        <div><strong>Прогноз угадан</strong><span>Победитель: {winnerTeam}</span></div>
      </div>
    );
  }
  if (prediction.winnerPosition) {
    return (
      <span className="compendium-star-race-status">
        Победитель: {winnerTeam}. Ваш прогноз: {selectedTeam ?? "не сделан"}.
      </span>
    );
  }
  if (quest.phase !== "active") {
    return (
      <span className="compendium-star-race-status">
        {quest.phase === "upcoming"
          ? "Приём прогнозов откроется в четверг в 18:00 МСК"
          : selectedTeam
            ? `Ваш прогноз: ${selectedTeam}. Ожидаем результат.`
            : "Приём прогнозов завершён"}
      </span>
    );
  }
  return (
    <div className="compendium-star-race-final-prediction">
      <label>
        Команда-победитель
        <select value={position} onChange={(event) => setPosition(Number(event.target.value))}>
          <option value={0}>Выберите команду</option>
          {prediction.teams.map((team, index) => (
            <option value={index + 1} key={team}>{team}</option>
          ))}
        </select>
      </label>
      <button type="button" disabled={!canSubmit || !position || isSubmitting} onClick={() => onSubmit(position)}>
        {isSubmitting ? <><FiLoader className="compendium-spinner" aria-hidden="true" />Сохраняем…</> : prediction.selectedPosition ? "Изменить прогноз" : "Сохранить прогноз"}
      </button>
      {selectedTeam && <span><FiClock aria-hidden="true" /> Текущий прогноз: {selectedTeam}</span>}
    </div>
  );
}
