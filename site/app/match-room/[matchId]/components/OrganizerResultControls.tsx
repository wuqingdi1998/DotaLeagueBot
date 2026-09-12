"use client";

import { useState } from "react";
import { FiEdit3, FiShield } from "react-icons/fi";
import type { WinnerSide } from "../model/series";
import type { MatchRoomCommand, MatchRoomSnapshot } from "../model/types";
import { GameResultForm } from "./GameResultForm";

type OrganizerResultControlsProps = {
  snapshot: MatchRoomSnapshot;
  isSending: boolean;
  send: (command: MatchRoomCommand) => Promise<boolean>;
};

export function OrganizerResultControls(props: OrganizerResultControlsProps) {
  const snapshot = props.snapshot;
  const [selectedGameNumber, setSelectedGameNumber] = useState<number | null>(null);
  if (!snapshot.isOrganizer) return null;

  if (snapshot.status !== "completed") {
    return (
      <section className="ordinary-room-organizer-results">
        <header>
          <FiShield aria-hidden="true" />
          <div>
            <span>Управление организатора</span>
            <strong>Зафиксировать без подтверждений капитанов</strong>
          </div>
        </header>
        <GameResultForm
          key={`${snapshot.status}-${snapshot.currentGameNumber}`}
          {...props}
          gameNumber={snapshot.currentGameNumber}
          eyebrow={`Карта ${snapshot.currentGameNumber}`}
          title="Укажите официальный результат"
          description="Результат будет принят сразу, даже если капитаны ничего не отправляли."
          submitLabel="Зафиксировать результат"
          createCommand={(dotaMatchId, winnerSide) => ({
            action: "SET_GAME_RESULT",
            dotaMatchId,
            winnerSide,
          })}
        />
      </section>
    );
  }

  const selectedGame = snapshot.games.find((game) => game.gameNumber === selectedGameNumber);
  return (
    <section className="ordinary-room-organizer-results">
      <header>
        <FiEdit3 aria-hidden="true" />
        <div><span>Управление организатора</span><strong>Исправить результат матча</strong></div>
      </header>
      <div className="ordinary-room-edit-map-list">
        {snapshot.games.map((game) => (
          <button
            type="button"
            className={selectedGameNumber === game.gameNumber ? "selected" : ""}
            key={game.gameNumber}
            onClick={() => setSelectedGameNumber(game.gameNumber)}
          >
            Исправить карту {game.gameNumber}
          </button>
        ))}
      </div>
      {selectedGame && (
        <GameResultForm
          key={selectedGame.gameNumber}
          {...props}
          gameNumber={selectedGame.gameNumber}
          initialDotaMatchId={selectedGame.dotaMatchId}
          initialWinnerSide={selectedGame.winnerSide as WinnerSide}
          eyebrow={`Карта ${selectedGame.gameNumber}`}
          title="Исправьте ID или победителя"
          description="После сохранения общий счёт пересчитается автоматически."
          submitLabel="Сохранить исправление"
          createCommand={(dotaMatchId, winnerSide) => ({
            action: "EDIT_GAME_RESULT",
            gameNumber: selectedGame.gameNumber,
            dotaMatchId,
            winnerSide,
          })}
        />
      )}
    </section>
  );
}
