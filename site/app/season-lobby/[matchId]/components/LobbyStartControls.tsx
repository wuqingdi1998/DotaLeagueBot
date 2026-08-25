"use client";

import { FiPlay, FiZap } from "react-icons/fi";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

export function LobbyStartControls({
  snapshot,
  isSending,
  send,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
}) {
  if (snapshot.status !== "waiting") return null;
  const onlineCount = snapshot.players.filter((player) => player.isOnline).length;
  if (!snapshot.isHost) {
    const host = snapshot.players.find((player) => player.isHost);
    return (
      <section className="season-room-waiting">
        <strong>Ожидание запуска</strong>
        <p>
          {host
            ? `Лобби запустит хост ${host.nickname}, когда игроки соберутся.`
            : "Организатор ещё не назначил хоста этого лобби."}
        </p>
        <span>{onlineCount}/10 игроков в сети</span>
      </section>
    );
  }
  return (
    <section className="season-room-start-controls">
      <div>
        <span>Готовность лобби</span>
        <strong>{onlineCount}/10 игроков в сети</strong>
        <p>
          Обычный старт доступен, когда все лампочки зелёные.
        </p>
      </div>
      <div>
        <button
          className="primary-button"
          type="button"
          disabled={isSending || !snapshot.allPlayersOnline}
          onClick={() => void send({ action: "START_VOTING", force: false })}
        >
          <FiPlay aria-hidden="true" /> Старт
        </button>
        <button
          className="season-room-force-start"
          type="button"
          disabled={isSending}
          onClick={() => {
            if (window.confirm(
              "Запустить голосование, даже если сайт считает некоторых игроков не в сети?",
            )) {
              void send({ action: "START_VOTING", force: true });
            }
          }}
        >
          <FiZap aria-hidden="true" /> Старт принудительно
        </button>
      </div>
    </section>
  );
}
