"use client";

import {
  useMemo,
  useState,
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
import {
  MAX_SEASON_LOBBY_COUNT,
  SEASON_LOBBY_SIZE,
  type SeasonLobbyOptimizationVariant,
} from "@/lib/season-lobby-optimization";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonRound } from "../model/season-types";
import { SeasonLobbyBuilderLobby } from "./SeasonLobbyBuilderLobby";
import { SeasonLobbyReserve } from "./SeasonLobbyReserve";
import {
  SeasonLobbyOptimizationMenu,
  seasonLobbyOptimizationLabel,
} from "./SeasonLobbyOptimizationMenu";

type TeamSide = "a" | "b";

export function SeasonLobbyBuilder({
  round,
  singleLobby = false,
}: {
  round: SeasonRound;
  singleLobby?: boolean;
}) {
  const { season } = useTournament();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState("");
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
  const unassignedRegistrations = round.registrations.filter(
    (registration) => !assignedPlayerIds.has(registration.player_id),
  );
  const standingsByPlayerId = useMemo(
    () =>
      new Map(
        (season.data?.previewStandings ?? season.data?.standings ?? []).map(
          (standing) => [standing.playerId, standing],
        ),
      ),
    [season.data?.previewStandings, season.data?.standings],
  );
  const editorTitle = singleLobby
    ? "Редактор лобби клоза"
    : "Редактор лобби этого тура";
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
    if (round.lobbies.length <= 1) return;
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

  function requestOptimization(variant: SeasonLobbyOptimizationVariant) {
    const label = seasonLobbyOptimizationLabel(variant);
    if (
      window.confirm(
        `Заменить текущую ручную расстановку вариантом «${label}»?`,
      )
    ) {
      void mutate("optimize", { optimizationVariant: variant });
    }
  }

  if (round.lobby_configuration_status === "none") {
    return (
      <section className="season-lobby-builder season-lobby-builder-empty">
        <div>
          <p className="card-kicker">Скрыто от участников</p>
          <h4>{editorTitle}</h4>
          <p>
            {singleLobby
              ? "Кнопка создаст один матч с двумя командами по 5 слотов."
              : "Кнопка создаст «Верхнее лобби» и «Нижнее лобби» с двумя командами по 5 слотов."}
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
          <h4>{editorTitle}</h4>
          <p>{configurationStatusText(round.lobby_configuration_status)}</p>
        </div>
        <span className={`season-builder-status ${round.lobby_configuration_status}`}>
          {configurationStatusLabel(round.lobby_configuration_status)}
        </span>
      </header>

      {isEditing && (
        <div className="season-builder-optimization">
          <span>
            Нажмите для обычного оптимального состава или наведите, чтобы
            выбрать другой вариант. Позиции 1–5 показаны сверху вниз.
          </span>
          <div className="season-builder-optimization-actions">
            <SeasonLobbyOptimizationMenu
              busy={Boolean(busyAction)}
              disabled={round.registrations.length < SEASON_LOBBY_SIZE}
              onOptimize={requestOptimization}
            />
            <button
              className="secondary-button compact"
              type="button"
              disabled={assignedPlayerIds.size === 0 || Boolean(busyAction)}
              onClick={() => void mutate("sortTier")}
            >
              <FiArrowDown aria-hidden="true" /> По тиру сверху вниз
            </button>
          </div>
        </div>
      )}

      <div className="season-builder-lobbies">
        {round.lobbies.map((lobby) => (
          <SeasonLobbyBuilderLobby
            busy={Boolean(busyAction)}
            isEditing={isEditing}
            key={lobby.id}
            lobby={lobby}
            selectedPlayerId={selectedPlayerId}
            showWinRates={!singleLobby}
            standingsByPlayerId={standingsByPlayerId}
            onAssign={assignToSlot}
            onSelect={setSelectedPlayerId}
            onUnassign={(playerId) =>
              void mutate("assign", { playerId, matchId: null })
            }
          />
        ))}
      </div>

      <SeasonLobbyReserve
        busy={Boolean(busyAction)}
        isEditing={isEditing}
        onSelect={setSelectedPlayerId}
        registrations={unassignedRegistrations}
        selectedPlayerId={selectedPlayerId}
      />

      <div className="season-builder-actions">
        {isEditing && (
          <>
            {!singleLobby && (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    round.lobbies.length >= MAX_SEASON_LOBBY_COUNT ||
                    Boolean(busyAction)
                  }
                  onClick={() => void mutate("add")}
                >
                  <FiPlus /> Добавить ещё одно лобби
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={round.lobbies.length <= 1 || Boolean(busyAction)}
                  onClick={removeOneLobby}
                >
                  <FiMinus /> Удалить одно лобби
                </button>
              </>
            )}
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
    optimize: "Оптимальный состав сохранён, остальные игроки перенесены в запас",
    sortTier: "Игроки внутри команд отсортированы по тиру сверху вниз",
    lock: "Лобби зафиксированы",
    edit: "Редактирование лобби включено",
    publish: "Лобби опубликованы",
    unpublish: "Публикация лобби отменена",
  };
  return messages[action] ?? "Лобби обновлены";
}
