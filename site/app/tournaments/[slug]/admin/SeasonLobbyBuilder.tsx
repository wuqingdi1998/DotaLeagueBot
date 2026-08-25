"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import {
  FiArrowDown,
  FiEdit3,
  FiLock,
  FiMinus,
  FiPlus,
  FiSend,
  FiX,
} from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import { sortSeasonRegistrations } from "../model/season-registration";
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
  const [playerOrder, setPlayerOrder] = useState<"registration" | "tier">(
    "registration",
  );
  const assignedPlayerIds = useMemo(
    () =>
      new Set(
        round.lobbies.flatMap((lobby) =>
          lobby.matches.flatMap((match) =>
            match.participants.map((player) => player.player_id),
          ),
        ),
      ),
    [round.lobbies],
  );
  const orderedRegistrations = useMemo(
    () =>
      playerOrder === "tier"
        ? sortSeasonRegistrations(round.registrations, "tier", "descending")
        : round.registrations,
    [playerOrder, round.registrations],
  );
  const unassignedRegistrations = orderedRegistrations.filter(
    (registration) => !assignedPlayerIds.has(registration.player_id),
  );
  const longestNicknameLength = Math.max(
    10,
    ...round.registrations.map((registration) =>
      Array.from(registration.nickname).length,
    ),
  );
  const playerPoolStyle = {
    "--season-builder-nickname-width": `${Math.min(
      28,
      longestNicknameLength + 2,
    )}ch`,
  } as CSSProperties;
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
          <p className="card-kicker">Скрыто от участников</p>
          <h4>Редактор лобби этого тура</h4>
          <p>
            Кнопка создаст «Верхнее лобби» и «Нижнее лобби» с двумя
            командами по 5 слотов.
          </p>
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
          <p className="card-kicker">Скрыто от участников</p>
          <h4>Редактор лобби этого тура</h4>
          <p>{configurationStatusText(round.lobby_configuration_status)}</p>
        </div>
        <span className={`season-builder-status ${round.lobby_configuration_status}`}>
          {configurationStatusLabel(round.lobby_configuration_status)}
        </span>
      </header>

      <div className="season-builder-pool-heading">
        <strong>Свободные игроки</strong>
        <div>
          <button
            className={playerOrder === "registration" ? "active" : ""}
            type="button"
            onClick={() => setPlayerOrder("registration")}
          >
            По регистрации
          </button>
          <button
            className={playerOrder === "tier" ? "active" : ""}
            type="button"
            onClick={() => setPlayerOrder("tier")}
          >
            Тир <FiArrowDown aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="season-builder-player-pool" style={playerPoolStyle}>
        {unassignedRegistrations.map((registration) => {
          const isSelected = registration.player_id === selectedPlayerId;
          return (
            <button
              className={`season-builder-player${isSelected ? " selected" : ""}`}
              type="button"
              draggable={isEditing}
              disabled={!isEditing || Boolean(busyAction)}
              key={registration.player_id}
              aria-label={`${registration.nickname}, тир ${registration.tier_snapshot ?? "—"}, роли ${registration.positions ?? "—"}`}
              onClick={() => setSelectedPlayerId(registration.player_id)}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", registration.player_id);
                setSelectedPlayerId(registration.player_id);
              }}
            >
              <span className="season-builder-player-name">
                <strong>{registration.nickname}</strong>
              </span>
              <span className="season-builder-player-tier">
                <strong>{registration.tier_snapshot ?? "—"}</strong>
              </span>
              <span className="season-builder-player-roles">
                <strong>{registration.positions ?? "—"}</strong>
              </span>
            </button>
          );
        })}
        {!unassignedRegistrations.length && (
          <p className="season-builder-pool-empty">
            Все зарегистрированные игроки распределены по лобби.
          </p>
        )}
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
              <FiMinus /> Удалить одно лобби
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
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const playerBySlot = new Map(players.map((player) => [player.slot_number, player]));
  const tierTotal = players.reduce((total, player) => total + (player.tier_snapshot ?? 0), 0);
  return (
    <section className="season-builder-team">
      <header><strong>{name}</strong><span>Сумма тиров: {tierTotal}</span></header>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((slotNumber) => {
        const player = playerBySlot.get(slotNumber);
        return (
          <div
            className={`season-builder-slot${player ? " filled" : ""}${
              dragOverSlot === slotNumber ? " drag-over" : ""
            }`}
            draggable={isEditing && Boolean(player)}
            key={slotNumber}
            onClick={() => {
              if (!isEditing || busy) return;
              if (selectedPlayerId) onAssign(selectedPlayerId, matchId, side, slotNumber);
              else if (player) onSelect(player.player_id);
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
              if (isEditing && playerId) onAssign(playerId, matchId, side, slotNumber);
            }}
          >
            <span>{slotNumber}</span>
            {player ? (
              <>
                <strong>{player.nickname}</strong>
                <small className="season-builder-slot-tier">
                  Тир {player.tier_snapshot ?? "—"}
                </small>
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
    </section>
  );
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
