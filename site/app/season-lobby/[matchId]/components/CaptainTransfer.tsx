"use client";

import { useState } from "react";
import { FiRepeat } from "react-icons/fi";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

export function CaptainTransfer({
  snapshot,
  isSending,
  send,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
}) {
  const currentPlayer = snapshot.players.find(
    (player) => player.playerId === snapshot.currentUserId,
  );
  const [newCaptainId, setNewCaptainId] = useState("");
  if (snapshot.status !== "drafting" || !currentPlayer?.isCaptain) return null;
  const teammates = snapshot.players.filter(
    (player) =>
      player.teamSide === currentPlayer.teamSide &&
      player.playerId !== currentPlayer.playerId,
  );
  return (
    <details className="season-room-captain-transfer">
      <summary><FiRepeat aria-hidden="true" /> Передать капитанство</summary>
      <div>
        <label>
          <span>Новый капитан</span>
          <select
            value={newCaptainId}
            onChange={(event) => setNewCaptainId(event.target.value)}
          >
            <option value="">Выберите игрока команды</option>
            {teammates.map((player) => (
              <option value={player.playerId} key={player.playerId}>
                {player.nickname}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          type="button"
          disabled={isSending || !newCaptainId}
          onClick={() => {
            const player = teammates.find((item) => item.playerId === newCaptainId);
            if (player && window.confirm(
              `Передать право управлять драфтом игроку ${player.nickname}?`,
            )) {
              void send({
                action: "TRANSFER_CAPTAIN",
                newCaptainPlayerId: newCaptainId,
              });
            }
          }}
        >
          Передать полномочия
        </button>
      </div>
    </details>
  );
}
