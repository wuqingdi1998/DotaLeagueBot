"use client";

import { useState } from "react";
import type { FinalPredictionRecord } from "../services/star-race-final-prediction-repository";

export function StarRaceFinalPredictionAdmin({
  initialPrediction,
}: {
  initialPrediction: FinalPredictionRecord;
}) {
  const [prediction, setPrediction] = useState(initialPrediction);
  const [teams, setTeams] = useState(() => Array.from({ length: 6 }, (_, index) => initialPrediction.teams[index] ?? ""));
  const [winner, setWinner] = useState(initialPrediction.winnerPosition ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function request(method: "PUT" | "PATCH", body: object) {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/compendium-star-race-final-prediction", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        error?: string;
        rewardedPlayers?: number;
        isOpened?: boolean;
        notifiedPlayers?: number;
        prediction?: FinalPredictionRecord;
      };
      if (!response.ok || !result.prediction) {
        throw new Error(result.error ?? "Не удалось сохранить финальный прогноз");
      }
      setPrediction(result.prediction);
      setTeams(result.prediction.teams);
      setWinner(result.prediction.winnerPosition ?? 0);
      setMessage(method === "PUT"
        ? result.isOpened
          ? `Команды сохранены, прогноз открыт до 05:00. Бот отправит уведомление участникам: ${result.notifiedPlayers ?? 0}.`
          : "Команды обновлены. Прогноз остаётся открытым до 05:00."
        : `Победитель сохранён. Звёзды получили игроков: ${result.rewardedPlayers ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить данные");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="prediction-admin-panel final-prediction-admin">
      <div className="prediction-admin-panel-heading">
        <div>
          <span>Гонка · суббота, 22 августа</span>
          <h2>Финальный прогноз</h2>
        </div>
      </div>
      <p className="prediction-admin-help">
        Укажите ровно шесть команд. Первое сохранение сразу откроет прогноз игрокам и запустит уведомления в Discord. Приём прогнозов завершится в субботу в 05:00, после чего выберите победителя — 10 звёзд будут выданы автоматически.
      </p>
      <div className="final-prediction-team-grid">
        {teams.map((team, index) => (
          <label key={index}>
            Команда {index + 1}
            <input
              value={team}
              disabled={Boolean(prediction.winnerPosition)}
              onChange={(event) => setTeams((current) => current.map((value, teamIndex) => teamIndex === index ? event.target.value : value))}
            />
          </label>
        ))}
      </div>
      {!prediction.winnerPosition && (
        <button className="prediction-admin-save" type="button" disabled={isSaving} onClick={() => void request("PUT", { teams })}>
          {isSaving ? "Сохраняем…" : "Сохранить команды"}
        </button>
      )}
      {prediction.teams.length === 6 && !prediction.winnerPosition && (
        <div className="final-prediction-winner">
          <label>
            Победитель турнира
            <select value={winner} onChange={(event) => setWinner(Number(event.target.value))}>
              <option value={0}>Выберите победителя</option>
              {prediction.teams.map((team, index) => <option value={index + 1} key={team}>{team}</option>)}
            </select>
          </label>
          <button className="prediction-admin-save" type="button" disabled={isSaving || !winner} onClick={() => void request("PATCH", { position: winner })}>
            Засчитать прогнозы
          </button>
        </div>
      )}
      {prediction.winnerPosition && (
        <p className="prediction-admin-help">Победитель: <strong>{prediction.teams[prediction.winnerPosition - 1]}</strong>. Результат уже зафиксирован.</p>
      )}
      {message && <div className="prediction-admin-inline-message" role="status">{message}</div>}
    </section>
  );
}
