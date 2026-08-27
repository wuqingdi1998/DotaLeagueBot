"use client";

import { useState } from "react";
import { FiPlay, FiShield } from "react-icons/fi";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

type TeamSide = "a" | "b";

function currentCaptainId(
  snapshot: SeasonLobbyRoomSnapshot,
  side: TeamSide,
): string {
  return snapshot.players.find(
    (player) => player.teamSide === side && player.isCaptain,
  )?.playerId ?? "";
}

export function OrganizerCaptainControls({
  snapshot,
  isSending,
  send,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
}) {
  const [teamACaptainId, setTeamACaptainId] = useState(
    currentCaptainId(snapshot, "a"),
  );
  const [teamBCaptainId, setTeamBCaptainId] = useState(
    currentCaptainId(snapshot, "b"),
  );

  if (!snapshot.isOrganizer) return null;
  const selections = [
    {
      side: "a" as const,
      name: snapshot.teamAName,
      value: teamACaptainId,
      setValue: setTeamACaptainId,
    },
    {
      side: "b" as const,
      name: snapshot.teamBName,
      value: teamBCaptainId,
      setValue: setTeamBCaptainId,
    },
  ];
  const isDrafting = snapshot.status === "drafting";

  return (
    <section className="season-room-organizer-captains">
      <header>
        <FiShield aria-hidden="true" />
        <div>
          <span>Управление организатора</span>
          <h2>{isDrafting ? "Изменить капитанов" : "Назначить капитанов вручную"}</h2>
          <p>
            {isDrafting
              ? "Новый капитан сразу получит право управлять текущим драфтом."
              : "Выберите по одному игроку из каждой команды и запустите драфт без голосования."}
          </p>
        </div>
      </header>
      <div className="season-room-organizer-captain-fields">
        {selections.map((selection) => {
          const players = snapshot.players.filter(
            (player) => player.teamSide === selection.side,
          );
          const activeCaptainId = currentCaptainId(snapshot, selection.side);
          return (
            <label key={selection.side}>
              <span>Команда {selection.side.toUpperCase()} · {selection.name}</span>
              <div>
                <select
                  value={selection.value}
                  onChange={(event) => selection.setValue(event.target.value)}
                >
                  <option value="">Выберите капитана</option>
                  {players.map((player) => (
                    <option value={player.playerId} key={player.playerId}>
                      {player.nickname}
                    </option>
                  ))}
                </select>
                {isDrafting && (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={
                      isSending ||
                      !selection.value ||
                      selection.value === activeCaptainId
                    }
                    onClick={() => {
                      const player = players.find(
                        (item) => item.playerId === selection.value,
                      );
                      if (player && window.confirm(
                        `Назначить игрока ${player.nickname} капитаном команды ${selection.side.toUpperCase()}?`,
                      )) {
                        void send({
                          action: "SET_CAPTAIN",
                          teamSide: selection.side,
                          newCaptainPlayerId: selection.value,
                        });
                      }
                    }}
                  >
                    Изменить
                  </button>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {!isDrafting && (
        <footer>
          <button
            className="season-room-force-start"
            type="button"
            disabled={isSending || !teamACaptainId || !teamBCaptainId}
            onClick={() => {
              if (window.confirm(
                "Принудительно запустить драфт с выбранными капитанами без голосования?",
              )) {
                void send({
                  action: "START_WITH_CAPTAINS",
                  teamACaptainId,
                  teamBCaptainId,
                  force: true,
                });
              }
            }}
          >
            <FiPlay aria-hidden="true" /> Назначить и запустить
          </button>
        </footer>
      )}
    </section>
  );
}
