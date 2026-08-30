"use client";

import { useState } from "react";
import { FiCheck, FiFlag } from "react-icons/fi";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

export function LobbyGameResult({
  snapshot,
  isSending,
  send,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dotaMatchId, setDotaMatchId] = useState("");
  const [winnerSide, setWinnerSide] = useState<"a" | "b" | "">("");

  if (snapshot.status === "completed") {
    return (
      <section className="season-room-result-state completed">
        <FiCheck aria-hidden="true" />
        <div>
          <strong>Матч завершён</strong>
          <p>Результаты обеих карт сохранены и уже учтены в таблице лиги.</p>
        </div>
      </section>
    );
  }
  if (snapshot.status !== "playing") return null;

  const host = snapshot.players.find((player) => player.isHost);
  if (!snapshot.isHost) {
    return (
      <section className="season-room-result-state waiting">
        <FiFlag aria-hidden="true" />
        <div>
          <strong>Идёт игра на карте {snapshot.currentGameNumber ?? "—"}</strong>
          <p>
            После игры результат внесёт {host?.nickname ?? "хост лобби"}.
          </p>
        </div>
      </section>
    );
  }

  if (!isFormOpen) {
    return (
      <section className="season-room-result-state host">
        <div>
          <strong>Карта {snapshot.currentGameNumber ?? "—"} запущена</strong>
          <p>Когда игра в Dota закончится, подтвердите её результат.</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setIsFormOpen(true)}
        >
          <FiFlag aria-hidden="true" /> Матч завершён
        </button>
      </section>
    );
  }

  const canSubmit = /^\d{1,32}$/.test(dotaMatchId.trim()) && winnerSide !== "";
  return (
    <section className="season-room-result-form">
      <header>
        <span>Карта {snapshot.currentGameNumber ?? "—"}</span>
        <strong>Сохраните результат игры</strong>
        <p>Укажите ID матча Dota 2 и команду-победителя.</p>
      </header>
      <label className="season-room-match-id-field">
        <span>ID матча</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          placeholder="Например, 1234567890"
          value={dotaMatchId}
          onChange={(event) =>
            setDotaMatchId(event.target.value.replace(/\D/g, ""))
          }
        />
      </label>
      <fieldset>
        <legend>Кто победил?</legend>
        <label>
          <input
            type="radio"
            name="season-game-winner"
            checked={winnerSide === "a"}
            onChange={() => setWinnerSide("a")}
          />
          <span>Team 1</span>
        </label>
        <label>
          <input
            type="radio"
            name="season-game-winner"
            checked={winnerSide === "b"}
            onChange={() => setWinnerSide("b")}
          />
          <span>Team 2</span>
        </label>
      </fieldset>
      <footer>
        <button
          className="secondary-button"
          type="button"
          disabled={isSending}
          onClick={() => setIsFormOpen(false)}
        >
          Назад
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={isSending || !canSubmit}
          onClick={async () => {
            if (!winnerSide) return;
            await send({
              action: "REPORT_GAME_RESULT",
              dotaMatchId: dotaMatchId.trim(),
              winnerSide,
            });
          }}
        >
          {isSending ? "Сохраняем…" : "OK"}
        </button>
      </footer>
    </section>
  );
}
