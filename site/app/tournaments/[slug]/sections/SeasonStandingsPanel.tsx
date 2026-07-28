"use client";

import Image from "next/image";
import { useState } from "react";
import type { SeasonStanding } from "@/lib/season";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonRound } from "../model/season-types";

export function SeasonStandingsPanel() {
  const { activeTab, data, season } = useTournament();
  const [showPreview, setShowPreview] = useState(false);
  if (
    !data ||
    data.tournament.tournament_type !== "seasonal" ||
    activeTab !== "standings"
  ) {
    return null;
  }
  if (!season.data) {
    return (
      <div className="tab-panel empty-standings">
        {season.error || "Загружаем таблицу…"}
      </div>
    );
  }
  const regularRounds = season.data.rounds.filter(
    (round) => round.round_kind === "regular",
  );
  const rounds = (
    showPreview
      ? regularRounds
      : regularRounds.filter((round) => round.is_visible)
  ).sort((left, right) => left.round_number - right.round_number);
  const standings =
    showPreview && season.data.previewStandings
      ? season.data.previewStandings
      : season.data.standings;
  const activeRows = standings.filter((row) => row.section === "active");
  const inactiveRows = standings.filter((row) => row.section === "inactive");

  return (
    <div className="tab-panel season-standings-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Общий зачёт</p>
          <h3>Таблица сезона</h3>
        </div>
        {season.data.isOrganizer && (
          <label className="season-preview-toggle">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(event) => setShowPreview(event.target.checked)}
            />
            Предпросмотр скрытых туров
          </label>
        )}
      </div>
      {!rounds.length ? (
        <div className="empty-standings">
          Таблица появится после публикации первого тура.
        </div>
      ) : (
        <>
          <div className="season-standings-layout">
            <StandingsTable rows={activeRows} rounds={rounds} isRanked />
            <SeasonStandingsLegend />
          </div>
          {inactiveRows.length > 0 && (
            <section className="season-inactive-standings">
              <h4>
                Игроки вне общей таблицы
                <small>инактив, покинули сервер, баны</small>
              </h4>
              <StandingsTable rows={inactiveRows} rounds={rounds} />
            </section>
          )}
          <SeasonPenaltyTable rows={standings} />
        </>
      )}
    </div>
  );
}

function StandingsTable({
  isRanked = false,
  rounds,
  rows,
}: {
  isRanked?: boolean;
  rounds: SeasonRound[];
  rows: SeasonStanding[];
}) {
  const { season } = useTournament();
  return (
    <div className="season-table-scroll">
      <table className="season-standings-table">
        <thead>
          <tr>
            <th>Место</th>
            <th className="season-player-column">Игрок</th>
            <th>Туры</th>
            <th>В</th>
            <th>Н</th>
            <th>П</th>
            <th>p</th>
            <th>Очки</th>
            <th>%WR</th>
            {rounds.map((round) => (
              <th key={round.id}>Тур {round.round_number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.playerId}>
              <td>{isRanked ? index + 1 : "—"}</td>
              <td className="season-player-column">
                <PlayerIdentity
                  nickname={row.nickname}
                  avatarUrl={row.avatarUrl}
                />
              </td>
              <td>{row.playedRounds}</td>
              <td>{row.wins}</td>
              <td>{row.draws}</td>
              <td>{row.losses}</td>
              <td className="season-adjustment-points">
                {row.hasAdjustments
                  ? `${row.adjustmentPoints > 0 ? "+" : ""}${row.adjustmentPoints}`
                  : ""}
              </td>
              <td><strong>{row.points}</strong></td>
              <td>
                {row.winRate === null
                  ? "—"
                  : `${(row.winRate * 100).toLocaleString("ru-RU", {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}%`}
              </td>
              {rounds.map((round) => {
                const cell = row.rounds[String(round.round_number)];
                return (
                  <td key={round.id}>
                    {cell?.matchIds.length ? (
                      <button
                        className={`season-result-cell ${cell.outcome}`}
                        onClick={() =>
                          season.openRound(
                            round.round_number,
                            cell.matchIds[0],
                          )
                        }
                        title="Открыть связанный матч"
                      >
                        {cell.outcome === "pending"
                          ? "…"
                          : cell.outcome === "substitute"
                            ? "З"
                            : cell.points}
                      </button>
                    ) : cell?.outcome === "suspended" ? (
                      <span
                        className="season-result-cell suspended"
                        title="Пропуск тура из-за штрафа"
                      >
                        ×
                      </span>
                    ) : (
                      <span className="season-result-cell absent">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeasonStandingsLegend() {
  return (
    <aside className="season-standings-legend" aria-label="Легенда таблицы">
      <h4>Как начисляются очки</h4>
      <p><i className="win" /> Победа <strong>+2</strong></p>
      <p><i className="draw" /> Ничья <strong>+1</strong></p>
      <p><i className="loss" /> Поражение <strong>0</strong></p>
      <p><i className="substitute" /> Игрок замены</p>
      <p><i className="suspended" /> Пропуск из-за штрафа</p>
      <p><i className="pending" /> Результат ещё не внесён</p>
      <hr />
      <p>
        <b>p</b> — ручные поправки, бонусы за замену и снятия за штрафные
        огоньки.
      </p>
      <p>
        <b>%WR</b> — процент выигранных карт. При равенстве очков выше
        ставится игрок с большим %WR, затем с большим числом сыгранных туров.
      </p>
    </aside>
  );
}

function SeasonPenaltyTable({ rows }: { rows: SeasonStanding[] }) {
  const penalized = rows.filter((row) => row.penaltyFires > 0);
  return (
    <section className="season-penalty-table-section">
      <h4>Штраф очков</h4>
      <p>
        Каждые 5 огоньков: −1 рейтинговое очко и пропуск следующего тура.
      </p>
      {!penalized.length ? (
        <p className="season-empty-copy">Штрафных огоньков пока нет.</p>
      ) : (
      <div className="season-table-scroll">
        <table className="season-penalty-table">
          <thead>
            <tr>
              <th>Игрок</th>
              {["I", "II", "III", "IV"].map((stage) => (
                <th key={stage}>Лимит {stage}</th>
              ))}
              <th>Всего</th>
              <th>Пропуск туров</th>
            </tr>
          </thead>
          <tbody>
            {penalized.map((row) => (
              <tr key={row.playerId}>
                <td>{row.nickname}</td>
                {row.penaltyStages.map((value, index) => (
                  <td className={value === 5 ? "filled" : ""} key={index}>
                    {value === null ? "—" : `🔥 ${value}`}
                  </td>
                ))}
                <td>{row.penaltyFires}</td>
                <td>
                  {row.suspendedRoundNumbers.length
                    ? row.suspendedRoundNumbers
                        .map((round) => `Тур ${round}`)
                        .join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}

function PlayerIdentity({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl: string | null;
}) {
  return (
    <span className="season-player-identity">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={34} height={34} unoptimized />
      ) : (
        <i>{nickname.slice(0, 1).toUpperCase()}</i>
      )}
      <strong>{nickname}</strong>
    </span>
  );
}
