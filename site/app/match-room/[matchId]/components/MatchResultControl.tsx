"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi";
import { completionButtonLabel, type WinnerSide } from "../model/series";
import type { MatchRoomCommand, MatchRoomSnapshot } from "../model/types";

function ResultForm({
  snapshot,
  isSending,
  isResolution,
  send,
}: {
  snapshot: MatchRoomSnapshot;
  isSending: boolean;
  isResolution: boolean;
  send: (command: MatchRoomCommand) => Promise<boolean>;
}) {
  const [dotaMatchId, setDotaMatchId] = useState("");
  const [winnerSide, setWinnerSide] = useState<WinnerSide | "">("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!winnerSide) return;
    await send({
      action: isResolution ? "RESOLVE_DISPUTE" : "REPORT_GAME_RESULT",
      dotaMatchId,
      winnerSide,
    });
  }
  return (
    <form className="season-room-result-form" onSubmit={(event) => void submit(event)}>
      <header>
        <span>{isResolution ? "Решение организатора" : `Карта ${snapshot.currentGameNumber}`}</span>
        <strong>{isResolution ? "Укажите правильный результат" : "Подтвердите результат карты"}</strong>
        <p>ID матча и победитель должны совпасть у обоих капитанов.</p>
      </header>
      <label className="season-room-match-id-field">
        <span>ID матча Dota 2</span>
        <input
          inputMode="numeric"
          pattern="[0-9]{5,20}"
          placeholder="Например, 8123456789"
          value={dotaMatchId}
          onChange={(event) => setDotaMatchId(event.target.value.replace(/\D/g, ""))}
          required
        />
      </label>
      <fieldset>
        <legend>Победитель карты</legend>
        {(["a", "b"] as const).map((side) => (
          <label key={side}>
            <input
              type="radio"
              name="winner"
              value={side}
              checked={winnerSide === side}
              onChange={() => setWinnerSide(side)}
              required
            />
            <span>{side === "a" ? snapshot.teamAName : snapshot.teamBName}</span>
          </label>
        ))}
      </fieldset>
      <footer>
        <button className="primary-button" disabled={isSending || !winnerSide || !dotaMatchId}>
          {isResolution ? "Зафиксировать результат" : completionButtonLabel(snapshot.bestOf, snapshot.currentGameNumber)}
        </button>
      </footer>
    </form>
  );
}

export function MatchResultControl(props: {
  snapshot: MatchRoomSnapshot;
  isSending: boolean;
  send: (command: MatchRoomCommand) => Promise<boolean>;
}) {
  const snapshot = props.snapshot;
  const ownReport = snapshot.reports.find((report) => report.captainId === snapshot.currentUserId);
  if (snapshot.status === "completed") {
    return (
      <section className="season-room-result-state completed">
        <FiCheckCircle aria-hidden="true" />
        <div><strong>Матч завершён</strong><p>Итоговый счёт сохранён автоматически: {snapshot.teamAScore}:{snapshot.teamBScore}.</p></div>
      </section>
    );
  }
  if (snapshot.status === "disputed") {
    return (
      <section className="ordinary-room-dispute">
        <header><FiAlertTriangle aria-hidden="true" /><div><strong>Результаты не совпали</strong><p>Организатор рассматривает спор.</p></div></header>
        <div className="ordinary-room-reports">
          {snapshot.reports.map((report) => (
            <article key={report.captainId}>
              <span>{report.captainName}</span>
              <strong>ID {report.dotaMatchId}</strong>
              <p>Победитель: {report.winnerSide === "a" ? snapshot.teamAName : snapshot.teamBName}</p>
            </article>
          ))}
        </div>
        {snapshot.isOrganizer && <ResultForm {...props} isResolution />}
      </section>
    );
  }
  if (snapshot.currentUserSide && !ownReport) {
    return <ResultForm {...props} isResolution={false} />;
  }
  return (
    <section className="season-room-result-state">
      <FiClock aria-hidden="true" />
      <div>
        <strong>{ownReport ? "Ваш результат сохранён" : `Ожидаем результаты карты ${snapshot.currentGameNumber}`}</strong>
        <p>{ownReport ? "Как только второй капитан подтвердит карту, счёт обновится автоматически." : "Результат вводят капитаны обеих команд."}</p>
      </div>
    </section>
  );
}
