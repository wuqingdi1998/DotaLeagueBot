"use client";

import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiTrash2 } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";

export function SeasonDisciplineAdmin() {
  const { data, season } = useTournament();
  const [adjustmentPlayerId, setAdjustmentPlayerId] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("1");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [penaltyPlayerId, setPenaltyPlayerId] = useState("");
  const [penaltyRoundId, setPenaltyRoundId] = useState("");
  const [fireCount, setFireCount] = useState("0");
  const [penaltyNote, setPenaltyNote] = useState("");
  const [finalistPlayerId, setFinalistPlayerId] = useState("");
  const [finalistSeed, setFinalistSeed] = useState("");
  const [finalistMedal, setFinalistMedal] = useState("");
  const [finalistNote, setFinalistNote] = useState("");

  if (
    !data ||
    data.tournament.tournament_type !== "seasonal" ||
    !season.data
  ) {
    return null;
  }

  const tournamentId = data.tournament.id;
  const regularRounds = season.data.rounds.filter(
    (round) => round.round_kind === "regular",
  );

  async function addAdjustment() {
    const result = await season.mutate("POST", {
      entity: "adjustment",
      tournamentId,
      playerId: adjustmentPlayerId,
      amount: adjustmentAmount,
      reason: adjustmentReason,
    });
    if (result.ok) {
      setAdjustmentPlayerId("");
      setAdjustmentReason("");
    }
  }

  async function savePenalty() {
    const result = await season.mutate("POST", {
      entity: "penalty",
      tournamentId,
      playerId: penaltyPlayerId,
      roundId: penaltyRoundId,
      fireCount,
      note: penaltyNote,
    });
    if (result.ok) {
      setPenaltyPlayerId("");
      setPenaltyNote("");
    }
  }

  async function saveFinalist() {
    const result = await season.mutate("POST", {
      entity: "finalist",
      tournamentId,
      playerId: finalistPlayerId,
      seed: finalistSeed,
      medal: finalistMedal || null,
      note: finalistNote,
    });
    if (result.ok) {
      setFinalistPlayerId("");
      setFinalistSeed("");
      setFinalistMedal("");
      setFinalistNote("");
    }
  }

  return (
    <section className="applications-panel season-discipline-admin">
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Таблица сезона</p>
          <h3>Игроки, очки p, штрафы и финалы</h3>
          <p>
            Игрока можно найти по Discord ID или Dota ID. После сохранения
            таблица пересчитается автоматически.
          </p>
        </div>
      </div>

      <AdminBlock title="Активные и выбывшие игроки">
        <div className="season-admin-record-list">
          {season.data.participants.map((player) => (
            <article key={player.discord_id}>
              <div>
                <strong>{player.nickname}</strong>
                <small>ID: {player.discord_id}</small>
                {player.inactive_reason && <span>{player.inactive_reason}</span>}
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  void season.mutate("PATCH", {
                    entity: "participant",
                    tournamentId,
                    playerId: player.discord_id,
                    section:
                      player.standings_section === "active"
                        ? "inactive"
                        : "active",
                    inactiveReason:
                      player.standings_section === "active"
                        ? "Перенесён организатором"
                        : null,
                  })
                }
              >
                {player.standings_section === "active" ? (
                  <><FiArrowRight /> Вне общей таблицы</>
                ) : (
                  <><FiArrowLeft /> Вернуть в общую таблицу</>
                )}
              </button>
            </article>
          ))}
        </div>
      </AdminBlock>

      <AdminBlock title="Ручное изменение столбца p">
        <div className="season-inline-admin-form">
          <label>
            <span>ID игрока</span>
            <input
              inputMode="numeric"
              value={adjustmentPlayerId}
              onChange={(event) => setAdjustmentPlayerId(event.target.value)}
            />
          </label>
          <label>
            <span>Плюс или минус</span>
            <input
              type="number"
              min="-99"
              max="99"
              value={adjustmentAmount}
              onChange={(event) => setAdjustmentAmount(event.target.value)}
            />
          </label>
          <label>
            <span>Причина</span>
            <input
              value={adjustmentReason}
              placeholder="Например: бонус организатора"
              onChange={(event) => setAdjustmentReason(event.target.value)}
            />
          </label>
          <button className="secondary-button" type="button" onClick={() => void addAdjustment()}>
            Начислить
          </button>
        </div>
        <RecordList
          emptyText="Ручных изменений p пока нет."
          records={season.data.pointAdjustments.map((adjustment) => ({
            id: adjustment.id,
            title: adjustment.nickname,
            value: `${adjustment.amount > 0 ? "+" : ""}${adjustment.amount} · ${adjustment.reason}`,
            onDelete: () =>
              season.mutate("DELETE", {
                entity: "adjustment",
                id: adjustment.id,
              }),
          }))}
        />
      </AdminBlock>

      <AdminBlock title="Штрафные огоньки">
        <div className="season-inline-admin-form">
          <label>
            <span>ID игрока</span>
            <input
              inputMode="numeric"
              value={penaltyPlayerId}
              onChange={(event) => setPenaltyPlayerId(event.target.value)}
            />
          </label>
          <label>
            <span>Тур</span>
            <select
              value={penaltyRoundId}
              onChange={(event) => setPenaltyRoundId(event.target.value)}
            >
              <option value="">Выберите тур</option>
              {regularRounds.map((round) => (
                <option value={round.id} key={round.id}>
                  Тур {round.round_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Огоньки за тур</span>
            <input
              type="number"
              min="0"
              max="100"
              value={fireCount}
              onChange={(event) => setFireCount(event.target.value)}
            />
          </label>
          <label>
            <span>Комментарий</span>
            <input
              value={penaltyNote}
              onChange={(event) => setPenaltyNote(event.target.value)}
            />
          </label>
          <button className="secondary-button" type="button" onClick={() => void savePenalty()}>
            Сохранить штраф
          </button>
        </div>
        <RecordList
          emptyText="Штрафных огоньков пока нет."
          records={season.data.penaltyEvents.map((penalty) => ({
            id: penalty.id,
            title: `${penalty.nickname} · Тур ${penalty.round_number}`,
            value: `🔥 ${penalty.fire_count}${penalty.note ? ` · ${penalty.note}` : ""}`,
            onDelete: () =>
              season.mutate("DELETE", {
                entity: "penalty",
                id: penalty.id,
              }),
          }))}
        />
      </AdminBlock>

      <AdminBlock title="Участники финалов">
        <div className="season-inline-admin-form">
          <label>
            <span>ID игрока</span>
            <input
              inputMode="numeric"
              value={finalistPlayerId}
              onChange={(event) => setFinalistPlayerId(event.target.value)}
            />
          </label>
          <label>
            <span>Номер посева</span>
            <input
              type="number"
              min="1"
              max="100"
              value={finalistSeed}
              onChange={(event) => setFinalistSeed(event.target.value)}
            />
          </label>
          <label>
            <span>Медаль</span>
            <select
              value={finalistMedal}
              onChange={(event) => setFinalistMedal(event.target.value)}
            >
              <option value="">Не назначена</option>
              <option value="gold">Золото</option>
              <option value="silver">Серебро</option>
            </select>
          </label>
          <label>
            <span>Комментарий</span>
            <input
              value={finalistNote}
              onChange={(event) => setFinalistNote(event.target.value)}
            />
          </label>
          <button className="secondary-button" type="button" onClick={() => void saveFinalist()}>
            Добавить или обновить
          </button>
        </div>
        <RecordList
          emptyText="Список финалистов пока пуст."
          records={season.data.finalists.map((finalist) => ({
            id: finalist.player_id,
            title: finalist.nickname,
            value: [
              finalist.seed ? `Посев ${finalist.seed}` : "",
              finalist.medal === "gold"
                ? "Золото"
                : finalist.medal === "silver"
                  ? "Серебро"
                  : "",
            ].filter(Boolean).join(" · ") || "Без посева и медали",
            onDelete: () =>
              season.mutate("DELETE", {
                entity: "finalist",
                tournamentId,
                playerId: finalist.player_id,
              }),
          }))}
        />
      </AdminBlock>
    </section>
  );
}

function AdminBlock({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="season-discipline-admin-block">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function RecordList({
  emptyText,
  records,
}: {
  emptyText: string;
  records: Array<{
    id: number | string;
    title: string;
    value: string;
    onDelete: () => Promise<unknown>;
  }>;
}) {
  if (!records.length) return <p className="season-empty-copy">{emptyText}</p>;
  return (
    <div className="season-admin-record-list">
      {records.map((record) => (
        <article key={record.id}>
          <div><strong>{record.title}</strong><span>{record.value}</span></div>
          <button
            className="danger-button"
            type="button"
            aria-label={`Удалить: ${record.title}`}
            onClick={() => void record.onDelete()}
          >
            <FiTrash2 />
          </button>
        </article>
      ))}
    </div>
  );
}
