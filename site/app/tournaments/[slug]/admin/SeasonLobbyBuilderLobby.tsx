"use client";

import { useState, type DragEvent } from "react";
import { FiX } from "react-icons/fi";
import type { SeasonLobbyWinRateStanding } from "../model/season-lobby-win-rate";
import {
  getSeasonLobbyPlayerWinRate,
  getSeasonLobbyTeamWinRate,
} from "../model/season-lobby-win-rate";
import type {
  SeasonLobby,
  SeasonMatchParticipant,
} from "../model/season-types";
import { SeasonLobbyScheduleEditor } from "./SeasonLobbyScheduleEditor";

type TeamSide = "a" | "b";

export function SeasonLobbyBuilderLobby({
  busy,
  isEditing,
  lobby,
  onAssign,
  onSelect,
  onUnassign,
  selectedPlayerId,
  showWinRates,
  standingsByPlayerId,
}: {
  busy: boolean;
  isEditing: boolean;
  lobby: SeasonLobby;
  onAssign: (playerId: string, matchId: number, side: TeamSide, slot: number) => void;
  onSelect: (playerId: string) => void;
  onUnassign: (playerId: string) => void;
  selectedPlayerId: string | null;
  showWinRates: boolean;
  standingsByPlayerId: ReadonlyMap<string, SeasonLobbyWinRateStanding>;
}) {
  const match = lobby.matches[0];
  if (!match) {
    return (
      <article className="season-builder-lobby">
        {lobby.name}: матч не создан
      </article>
    );
  }
  return (
    <article className="season-builder-lobby">
      <div className="season-builder-lobby-heading">
        <h5>{lobby.name}</h5>
        <SeasonLobbyScheduleEditor lobby={lobby} />
      </div>
      <div className="season-builder-teams">
        {(["a", "b"] as const).map((side) => (
          <BuilderTeam
            busy={busy}
            isEditing={isEditing}
            key={side}
            matchId={match.id}
            name={side === "a" ? "Левая команда" : "Правая команда"}
            onAssign={onAssign}
            onSelect={onSelect}
            onUnassign={onUnassign}
            players={match.participants.filter(
              (player) => player.team_side === side,
            )}
            selectedPlayerId={selectedPlayerId}
            showWinRates={showWinRates}
            side={side}
            standingsByPlayerId={standingsByPlayerId}
          />
        ))}
      </div>
    </article>
  );
}

function BuilderTeam({
  busy,
  isEditing,
  matchId,
  name,
  onAssign,
  onSelect,
  onUnassign,
  players,
  selectedPlayerId,
  showWinRates,
  side,
  standingsByPlayerId,
}: {
  busy: boolean;
  isEditing: boolean;
  matchId: number;
  name: string;
  onAssign: (playerId: string, matchId: number, side: TeamSide, slot: number) => void;
  onSelect: (playerId: string) => void;
  onUnassign: (playerId: string) => void;
  players: SeasonMatchParticipant[];
  selectedPlayerId: string | null;
  showWinRates: boolean;
  side: TeamSide;
  standingsByPlayerId: ReadonlyMap<string, SeasonLobbyWinRateStanding>;
}) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const playerBySlot = new Map(
    players.map((player) => [player.slot_number, player]),
  );
  const tierTotal = players.reduce(
    (total, player) => total + (player.tier_snapshot ?? 0),
    0,
  );
  const teamWinRate = getSeasonLobbyTeamWinRate(
    players.map((player) => player.player_id),
    standingsByPlayerId,
  );
  return (
    <section className="season-builder-team">
      <header>
        <strong>{name}</strong>
        <span>Сумма тиров: {tierTotal}</span>
      </header>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((slotNumber) => {
        const player = playerBySlot.get(slotNumber);
        const playerWinRate = getSeasonLobbyPlayerWinRate(
          player ? standingsByPlayerId.get(player.player_id) : undefined,
        );
        return (
          <div
            className={`season-builder-slot${
              showWinRates ? " with-win-rate" : ""
            }${player ? " filled" : ""}${
              dragOverSlot === slotNumber ? " drag-over" : ""
            }`}
            draggable={isEditing && Boolean(player)}
            key={slotNumber}
            onClick={() => {
              if (!isEditing || busy) return;
              if (selectedPlayerId) {
                onAssign(selectedPlayerId, matchId, side, slotNumber);
              } else if (player) onSelect(player.player_id);
            }}
            onDragStart={(event) => {
              if (!isEditing || !player) return;
              event.dataTransfer.setData("text/plain", player.player_id);
              event.dataTransfer.effectAllowed = "move";
              onSelect(player.player_id);
            }}
            onDragEnter={(event) => {
              if (!isEditing) return;
              event.preventDefault();
              setDragOverSlot(slotNumber);
            }}
            onDragLeave={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const isOutside =
                event.clientX <= bounds.left ||
                event.clientX >= bounds.right ||
                event.clientY <= bounds.top ||
                event.clientY >= bounds.bottom;
              if (isOutside) {
                setDragOverSlot((current) =>
                  current === slotNumber ? null : current,
                );
              }
            }}
            onDragOver={(event) => {
              if (!isEditing) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragOverSlot(slotNumber);
            }}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setDragOverSlot(null);
              const playerId = event.dataTransfer.getData("text/plain");
              if (isEditing && playerId) {
                onAssign(playerId, matchId, side, slotNumber);
              }
            }}
          >
            <span>{slotNumber}</span>
            {player ? (
              <>
                <strong>{player.nickname}</strong>
                <small className="season-builder-slot-tier season-builder-tier-badge">
                  {player.tier_snapshot ?? "—"}
                </small>
                {showWinRates && (
                  <small
                    className={`season-builder-win-rate-badge${
                      playerWinRate.estimated ? " estimated" : ""
                    }`}
                    title={
                      playerWinRate.estimated
                        ? "Менее трёх сыгранных туров — для баланса считается 50%"
                        : "Винрейт игрока в этой сезонной лиге"
                    }
                  >
                    {playerWinRate.label}
                  </small>
                )}
                <small className="season-builder-slot-roles">
                  Роли {player.positions ?? "—"}
                </small>
                {isEditing && (
                  <button
                    type="button"
                    aria-label={`Убрать ${player.nickname} из лобби`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onUnassign(player.player_id);
                    }}
                  >
                    <FiX aria-hidden="true" />
                  </button>
                )}
              </>
            ) : (
              <em>{isEditing ? "Перетащите игрока" : "Пустой слот"}</em>
            )}
          </div>
        );
      })}
      {showWinRates && teamWinRate && (
        <footer className="season-builder-team-win-rate">
          Средний винрейт пятёрки: <strong>{teamWinRate.label}</strong>
        </footer>
      )}
    </section>
  );
}
