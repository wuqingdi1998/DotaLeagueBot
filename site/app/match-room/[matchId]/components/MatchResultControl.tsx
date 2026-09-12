"use client";

import { FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi";
import { completionButtonLabel } from "../model/series";
import type { MatchRoomCommand, MatchRoomSnapshot } from "../model/types";
import { GameResultForm } from "./GameResultForm";
import { OrganizerResultControls } from "./OrganizerResultControls";

export function MatchResultControl(props: {
  snapshot: MatchRoomSnapshot;
  isSending: boolean;
  send: (command: MatchRoomCommand) => Promise<boolean>;
}) {
  const snapshot = props.snapshot;
  const ownReport = snapshot.reports.find((report) => report.captainId === snapshot.currentUserId);
  if (snapshot.status === "completed") {
    return (
      <>
        <section className="season-room-result-state completed">
          <FiCheckCircle aria-hidden="true" />
          <div><strong>Матч завершён</strong><p>Итоговый счёт сохранён автоматически: {snapshot.teamAScore}:{snapshot.teamBScore}.</p></div>
        </section>
        <OrganizerResultControls {...props} />
      </>
    );
  }
  if (snapshot.status === "disputed") {
    return (
      <>
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
        </section>
        <OrganizerResultControls {...props} />
      </>
    );
  }
  if (snapshot.currentUserSide && !ownReport && !snapshot.isOrganizer) {
    return (
      <>
        <GameResultForm
          key={snapshot.currentGameNumber}
          {...props}
          gameNumber={snapshot.currentGameNumber}
          eyebrow={`Карта ${snapshot.currentGameNumber}`}
          title="Подтвердите результат карты"
          description="ID матча и победитель должны совпасть у обоих капитанов."
          submitLabel={completionButtonLabel(snapshot.bestOf, snapshot.currentGameNumber)}
          createCommand={(dotaMatchId, winnerSide) => ({
            action: "REPORT_GAME_RESULT",
            dotaMatchId,
            winnerSide,
          })}
        />
        <OrganizerResultControls {...props} />
      </>
    );
  }
  return (
    <>
      <section className="season-room-result-state">
        <FiClock aria-hidden="true" />
        <div>
          <strong>{ownReport ? "Ваш результат сохранён" : `Ожидаем результаты карты ${snapshot.currentGameNumber}`}</strong>
          <p>{ownReport ? "Как только второй капитан подтвердит карту, счёт обновится автоматически." : "Результат вводят капитаны обеих команд."}</p>
        </div>
      </section>
      <OrganizerResultControls {...props} />
    </>
  );
}
