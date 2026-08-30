"use client";

import { useState } from "react";
import { FiEye, FiEyeOff, FiPlus, FiTrash2 } from "react-icons/fi";
import { toMoscowDateTimeInput } from "@/lib/moscow-date-time";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonLobby, SeasonRound } from "../model/season-types";
import { SeasonMatchAdmin } from "./SeasonMatchAdmin";
import { SeasonPublishedLobbyTools } from "./SeasonPublishedLobbyTools";

export function SeasonAdminPanel() {
  const { data, loadData, season } = useTournament();
  const [roundCount, setRoundCount] = useState(
    data?.tournament.season_round_count ?? 1,
  );
  if (!data || data.tournament.tournament_type !== "seasonal") return null;

  async function resize(confirmDelete = false) {
    const result = await season.mutate("PATCH", {
      entity: "season",
      tournamentId: data?.tournament.id,
      roundCount,
      confirmDelete,
    });
    if (
      result.requiresConfirmation &&
      window.confirm(
        "В удаляемых турах уже есть данные. Удалить эти туры вместе с лобби, матчами и результатами?",
      )
    ) {
      await resize(true);
    } else if (!result.requiresConfirmation) {
      await loadData();
    }
  }

  return (
    <section className="applications-panel season-admin-panel">
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Сезонный формат</p>
          <h3>Настройки туров и финального этапа</h3>
          <p>
            Здесь задаются названия, даты и видимость туров. Статус обычного
            тура меняется автоматически: в момент старта он становится
            активным, а через три часа — завершённым. Финалы вынесены в
            отдельную последнюю вкладку и не влияют на общую таблицу.
          </p>
        </div>
      </div>
      <div className="season-count-editor">
        <label>
          <span>Общее количество туров</span>
          <input
            type="number"
            min="1"
            max="100"
            value={roundCount}
            onChange={(event) => setRoundCount(Number(event.target.value))}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void resize()}
        >
          Изменить количество
        </button>
      </div>
      {!season.data ? (
        <div className="empty-standings">
          {season.error || "Загружаем туры…"}
        </div>
      ) : (
        <div className="season-round-admin-list">
          {season.data.rounds.map((round) => (
            <SeasonRoundAdmin round={round} key={round.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function SeasonRoundAdmin({ round }: { round: SeasonRound }) {
  const { season } = useTournament();
  const [name, setName] = useState(round.name ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    toMoscowDateTimeInput(round.scheduled_at),
  );
  const [status, setStatus] = useState(round.status);
  const [isVisible, setIsVisible] = useState(round.is_visible);

  async function save(confirmEmpty = false) {
    const result = await season.mutate("PATCH", {
      entity: "round",
      id: round.id,
      name,
      scheduledAt,
      status,
      isVisible,
      confirmEmpty,
    });
    if (
      result.requiresConfirmation &&
      window.confirm(
        "В этом туре ещё нет завершённых матчей. Всё равно показать его пользователям?",
      )
    ) {
      await save(true);
    }
  }

  async function addLobby() {
    await season.mutate("POST", {
      entity: "lobby",
      roundId: round.id,
      name: `Лобби ${round.lobbies.length + 1}`,
      status: "draft",
    });
  }

  return (
    <details className="season-round-admin-card">
      <summary>
        <span>
          {round.round_kind === "finals"
            ? "Финальный этап"
            : `Тур ${round.round_number}`}
        </span>
        <strong>
          {round.name ||
            (round.round_kind === "finals"
              ? "Финалы"
              : `Тур ${round.round_number}`)}
        </strong>
        <em className={round.is_visible ? "visible" : "hidden"}>
          {round.is_visible ? <FiEye /> : <FiEyeOff />}
          {round.is_visible ? "Опубликован" : "Скрыт"}
        </em>
      </summary>
      <div className="season-round-admin-content">
        {round.round_kind === "finals" && (
          <p className="season-empty-copy">
            Создайте два матча по 5 игроков в каждой команде. После внесения
            победителей сайт автоматически выдаст 10 золотых и 10 серебряных
            медалей.
          </p>
        )}
        <div className="season-admin-fields">
          <label>
            <span>Название</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Дата и время</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
          {round.round_kind === "finals" && (
            <label>
              <span>Статус финалов</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as SeasonRound["status"])
                }
              >
                <option value="planned">Запланирован</option>
                <option value="active">Идёт</option>
                <option value="completed">Завершён</option>
                <option value="cancelled">Отменён</option>
              </select>
            </label>
          )}
          <label className="season-visibility-field">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(event) => setIsVisible(event.target.checked)}
            />
            <span>
              {round.round_kind === "finals"
                ? "Показывать финалы пользователям"
                : "Показывать тур пользователям"}
            </span>
          </label>
        </div>
        <div className="season-admin-actions">
          <button
            className="secondary-button tournament-save-button"
            onClick={() => void save()}
          >
            Сохранить тур
          </button>
          <button
            className="secondary-button"
            onClick={() => season.openRound(round.round_number)}
          >
            Открыть
          </button>
          {round.round_kind === "finals" && (
            <button className="secondary-button" onClick={() => void addLobby()}>
              <FiPlus /> Добавить лобби
            </button>
          )}
        </div>
        {round.round_kind === "regular" && round.lobbies.length > 0 && (
          <section className="season-round-result-admin">
            <h4>Созданные лобби и результаты</h4>
            <p>
              Здесь можно исправить счёт, ID и победителей карт, а также
              добавить или изменить замену после завершения матча.
            </p>
            {round.lobbies.map((lobby, index) => (
              <SeasonPublishedLobbyTools
                lobby={lobby}
                isOpenByDefault={index === 0}
                key={lobby.id}
              />
            ))}
          </section>
        )}
        {round.round_kind === "finals" && (
          <div className="season-lobby-admin-list">
            {round.lobbies.map((lobby) => (
              <SeasonLobbyAdmin lobby={lobby} key={lobby.id} />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function SeasonLobbyAdmin({ lobby }: { lobby: SeasonLobby }) {
  const { season } = useTournament();
  const [name, setName] = useState(lobby.name);
  const [scheduledAt, setScheduledAt] = useState(
    toMoscowDateTimeInput(lobby.scheduled_at),
  );

  async function save() {
    await season.mutate("PATCH", {
      entity: "lobby",
      id: lobby.id,
      name,
      status: lobby.status,
      scheduledAt,
    });
  }

  async function remove() {
    if (!window.confirm("Удалить лобби вместе с его матчами и картами?")) return;
    await season.mutate("DELETE", { entity: "lobby", id: lobby.id });
  }

  async function addMatch() {
    await season.mutate("POST", {
      entity: "match",
      lobbyId: lobby.id,
      teamAName: "Команда A",
      teamBName: "Команда B",
      bestOf: 2,
      status: "draft",
      teamAPlayerIds: [],
      teamBPlayerIds: [],
    });
  }

  return (
    <article className="season-lobby-admin-card">
      <div className="season-admin-fields">
        <label>
          <span>Лобби</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>Время</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </label>
      </div>
      <div className="season-admin-actions">
        <button
          className="secondary-button tournament-save-button"
          onClick={() => void save()}
        >
          Сохранить лобби
        </button>
        <button className="secondary-button" onClick={() => void addMatch()}>
          <FiPlus /> Добавить матч
        </button>
        <button className="danger-button" onClick={() => void remove()}>
          <FiTrash2 /> Удалить
        </button>
      </div>
      {lobby.matches.map((match) => (
        <SeasonMatchAdmin match={match} key={match.id} />
      ))}
    </article>
  );
}
