"use client";

import { useMemo, useState, type DragEvent } from "react";
import { FiEdit3, FiLock, FiMinus, FiPlus, FiSend, FiX } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import type {
  SeasonLobby,
  SeasonMatchParticipant,
  SeasonRound,
} from "../model/season-types";

type TeamSide = "a" | "b";

export function SeasonLobbyBuilder({ round }: { round: SeasonRound }) {
  const { season } = useTournament();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const assignments = useMemo(() => buildAssignments(round.lobbies), [round.lobbies]);
  if (!season.data?.isOrganizer || round.round_kind !== "regular") return null;

  async function mutate(action: string, extra: Record<string, unknown> = {}) {
    if (busyAction) return;
    setBusyAction(action);
    try {
      const result = await season.mutate(
        "POST",
        {
          entity: "lobbyConfiguration",
          roundId: round.id,
          action,
          ...extra,
        },
        lobbyActionMessage(action),
      );
      if (result.ok) setSelectedPlayerId(null);
    } finally {
      setBusyAction("");
    }
  }

  function removeOneLobby() {
    if (round.lobbies.length <= 2) return;
    const targetIndex = round.lobbies.length === 3 ? 1 : round.lobbies.length - 1;
    const target = round.lobbies[targetIndex];
    const playerCount = target.matches.flatMap((match) => match.participants).length;
    if (
      playerCount > 0 &&
      !window.confirm(
        `${target.name} содержит ${playerCount} игроков. Удалить лобби и вернуть игроков в общий список?`,
      )
    ) {
      return;
    }
    void mutate("remove");
  }

  function assignToSlot(
    playerId: string,
    matchId: number,
    teamSide: TeamSide,
    slotNumber: number,
  ) {
    void mutate("assign", { playerId, matchId, teamSide, slotNumber });
  }

  if (round.lobby_configuration_status === "none") {
    return (
      <section className="season-lobby-builder season-lobby-builder-empty">
        <div>
          <p className="card-kicker">Только для организатора</p>
          <h4>Распределение игроков по лобби</h4>
          <p>Создайте два начальных лобби и распределите зарегистрированных игроков.</p>
        </div>
        <button
          className="primary-button compact"
          type="button"
          disabled={Boolean(busyAction)}
          onClick={() => void mutate("create")}
        >
          <FiPlus /> Создать лобби
        </button>
      </section>
    );
  }

  const isEditing = round.lobby_configuration_status === "editing";
  return (
    <section className="season-lobby-builder">
      <header className="season-lobby-builder-heading">
        <div>
          <p className="card-kicker">Только для организатора</p>
          <h4>Распределение игроков по лобби</h4>
          <p>{configurationStatusText(round.lobby_configuration_status)}</p>
        </div>
        <span className={`season-builder-status ${round.lobby_configuration_status}`}>
          {configurationStatusLabel(round.lobby_configuration_status)}
        </span>
      </header>

      <div className="season-builder-player-pool">
        {round.registrations.map((registration) => {
          const assignment = assignments.get(registration.player_id);
          const isSelected = registration.player_id === selectedPlayerId;
          return (
            <button
              className={`season-builder-player${isSelected ? " selected" : ""}`}
              type="button"
              draggable={isEditing}
              disabled={!isEditing || Boolean(busyAction)}
              key={registration.player_id}
              onClick={() => setSelectedPlayerId(registration.player_id)}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", registration.player_id);
                setSelectedPlayerId(registration.player_id);
              }}
            >
              <span>
                <strong>{registration.nickname}</strong>
                <small>Тир {registration.tier_snapshot ?? "—"}</small>
              </span>
              <em>
                {assignment
                  ? `${assignment.lobbyName}, ${assignment.teamName}, слот ${assignment.slotNumber}`
                  : "Не распределён"}
              </em>
            </button>
          );
        })}
      </div>

      <div className="season-builder-lobbies">
        {round.lobbies.map((lobby) => (
          <BuilderLobby
            busy={Boolean(busyAction)}
            isEditing={isEditing}
            key={lobby.id}
            lobby={lobby}
            selectedPlayerId={selectedPlayerId}
            onAssign={assignToSlot}
            onSelect={setSelectedPlayerId}
            onUnassign={(playerId) =>
              void mutate("assign", { playerId, matchId: null })
            }
          />
        ))}
      </div>

      <div className="season-builder-actions">
        {isEditing && (
          <>
            <button
              className="secondary-button"
              type="button"
              disabled={round.lobbies.length >= 4 || Boolean(busyAction)}
              onClick={() => void mutate("add")}
            >
              <FiPlus /> Добавить ещё одно лобби
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={round.lobbies.length <= 2 || Boolean(busyAction)}
              onClick={removeOneLobby}
            >
              <FiMinus /> Убрать одно лобби
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => void mutate("lock")}
            >
              <FiLock /> Зафиксировать лобби
            </button>
          </>
        )}
        {round.lobby_configuration_status === "locked" && (
          <>
            <button
              className="secondary-button"
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => void mutate("edit")}
            >
              <FiEdit3 /> Редактировать
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => void mutate("publish")}
            >
              <FiSend /> Опубликовать
            </button>
          </>
        )}
        {round.lobby_configuration_status === "published" && (
          <button
            className="secondary-button"
            type="button"
            disabled={Boolean(busyAction)}
            onClick={() => void mutate("unpublish")}
          >
            <FiX /> Отменить публикацию
          </button>
        )}
      </div>
    </section>
  );
}

function BuilderLobby({
  busy,
  isEditing,
  lobby,
  onAssign,
  onSelect,
  onUnassign,
  selectedPlayerId,
}: {
  busy: boolean;
  isEditing: boolean;
  lobby: SeasonLobby;
  onAssign: (playerId: string, matchId: number, side: TeamSide, slot: number) => void;
  onSelect: (playerId: string) => void;
  onUnassign: (playerId: string) => void;
  selectedPlayerId: string | null;
}) {
  const match = lobby.matches[0];
  if (!match) return <article className="season-builder-lobby">{lobby.name}: матч не создан</article>;
  return (
    <article className="season-builder-lobby">
      <h5>{lobby.name}</h5>
      <div className="season-builder-teams">
        <BuilderTeam
          busy={busy}
          isEditing={isEditing}
          matchId={match.id}
          name="Левая команда"
          onAssign={onAssign}
          onSelect={onSelect}
          onUnassign={onUnassign}
          players={match.participants.filter((player) => player.team_side === "a")}
          selectedPlayerId={selectedPlayerId}
          side="a"
        />
        <BuilderTeam
          busy={busy}
          isEditing={isEditing}
          matchId={match.id}
          name="Правая команда"
          onAssign={onAssign}
          onSelect={onSelect}
          onUnassign={onUnassign}
          players={match.participants.filter((player) => player.team_side === "b")}
          selectedPlayerId={selectedPlayerId}
          side="b"
        />
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
  side,
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
  side: TeamSide;
}) {
  const playerBySlot = new Map(players.map((player) => [player.slot_number, player]));
  const tierTotal = players.reduce((total, player) => total + (player.tier_snapshot ?? 0), 0);
  return (
    <section className="season-builder-team">
      <header><strong>{name}</strong><span>Сумма тиров: {tierTotal}</span></header>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((slotNumber) => {
        const player = playerBySlot.get(slotNumber);
        return (
          <div
            className={`season-builder-slot${player ? " filled" : ""}`}
            key={slotNumber}
            onClick={() => {
              if (!isEditing || busy) return;
              if (selectedPlayerId) onAssign(selectedPlayerId, matchId, side, slotNumber);
              else if (player) onSelect(player.player_id);
            }}
            onDragOver={(event) => isEditing && event.preventDefault()}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              const playerId = event.dataTransfer.getData("text/plain");
              if (isEditing && playerId) onAssign(playerId, matchId, side, slotNumber);
            }}
          >
            <span>{slotNumber}</span>
            {player ? (
              <>
                <strong draggable={isEditing}>{player.nickname}</strong>
                <small>Тир {player.tier_snapshot ?? "—"}</small>
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
    </section>
  );
}

function buildAssignments(lobbies: SeasonLobby[]) {
  const assignments = new Map<
    string,
    { lobbyName: string; teamName: string; slotNumber: number }
  >();
  for (const lobby of lobbies) {
    for (const match of lobby.matches) {
      for (const player of match.participants) {
        assignments.set(player.player_id, {
          lobbyName: lobby.name,
          teamName: player.team_side === "a" ? "левая команда" : "правая команда",
          slotNumber: player.slot_number ?? 0,
        });
      }
    }
  }
  return assignments;
}

function configurationStatusLabel(status: SeasonRound["lobby_configuration_status"]) {
  if (status === "editing") return "Редактирование";
  if (status === "locked") return "Зафиксировано";
  return status === "published" ? "Опубликовано" : "Не создано";
}

function configurationStatusText(status: SeasonRound["lobby_configuration_status"]) {
  if (status === "editing") return "Перетаскивайте игроков или выбирайте игрока и затем слот.";
  if (status === "locked") return "Составы сохранены и закрыты для изменений.";
  return "Составы видны всем посетителям страницы тура.";
}

function lobbyActionMessage(action: string) {
  const messages: Record<string, string> = {
    create: "Созданы верхнее и нижнее лобби",
    add: "Лобби добавлено",
    remove: "Лобби удалено",
    assign: "Распределение обновлено",
    lock: "Лобби зафиксированы",
    edit: "Редактирование лобби включено",
    publish: "Лобби опубликованы",
    unpublish: "Публикация лобби отменена",
  };
  return messages[action] ?? "Лобби обновлены";
}
