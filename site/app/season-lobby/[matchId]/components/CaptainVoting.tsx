"use client";

import { useState } from "react";
import { FiCheck, FiUsers } from "react-icons/fi";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

export function CaptainVoting({
  snapshot,
  isSending,
  send,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
}) {
  const [candidateId, setCandidateId] = useState(
    snapshot.ownVoteCandidateId ?? "",
  );
  if (snapshot.status !== "voting") return null;
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  return (
    <section className="season-room-voting">
      <header>
        <FiUsers aria-hidden="true" />
        <div>
          <span>Обязательное голосование</span>
          <h2>Выберите капитана своей команды</h2>
          <p>
            Воздержаться нельзя. При равенстве голосов победит игрок более высокого тира.
          </p>
        </div>
      </header>
      <div className="season-room-candidate-list">
        {team.map((player) => (
          <label key={player.playerId}>
            <input
              type="radio"
              name="captain"
              value={player.playerId}
              checked={candidateId === player.playerId}
              onChange={() => setCandidateId(player.playerId)}
            />
            <span>
              <strong>{player.nickname}</strong>
              <small>тир {player.tier ?? "—"}</small>
            </span>
          </label>
        ))}
      </div>
      <footer>
        <span>
          Проголосовали: {snapshot.teamVoteCount}/{snapshot.teamPlayerCount}
        </span>
        <button
          className="primary-button"
          type="button"
          disabled={isSending || !candidateId}
          onClick={() => void send({
            action: "VOTE_CAPTAIN",
            candidatePlayerId: candidateId,
          })}
        >
          <FiCheck aria-hidden="true" />
          {snapshot.ownVoteCandidateId ? "Изменить голос" : "Подтвердить голос"}
        </button>
      </footer>
    </section>
  );
}
