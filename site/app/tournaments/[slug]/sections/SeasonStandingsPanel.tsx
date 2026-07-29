"use client";

import Image from "next/image";
import { useState } from "react";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import type { SeasonStanding } from "@/lib/season";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonRound } from "../model/season-types";
import { HorizontalDragScroll } from "../components/HorizontalDragScroll";

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
    <HorizontalDragScroll>
      <table className="season-standings-table">
        <thead>
          <tr>
            <th>Место</th>
            <th
              className="season-player-avatar-column"
              aria-label="Аватар игрока"
            />
            <th className="season-player-name-column">Игрок</th>
            <th className="season-compact-column">Туры</th>
            <th className="season-compact-column">В</th>
            <th className="season-compact-column">Н</th>
            <th className="season-compact-column">П</th>
            <th className="season-compact-column">p</th>
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
              <PlayerIdentityCells
                dotaId={row.dotaId}
                nickname={row.nickname}
                avatarUrl={row.avatarUrl}
              />
              <td className="season-compact-column">{row.playedRounds}</td>
              <td className="season-compact-column">{row.wins}</td>
              <td className="season-compact-column">{row.draws}</td>
              <td className="season-compact-column">{row.losses}</td>
              <td className="season-compact-column season-adjustment-points">
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
    </HorizontalDragScroll>
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
      <hr />
      <p className="season-legend-explanation">
        <b>p</b> — ручные поправки, бонусы за замену и снятия за штрафные
        огоньки.
      </p>
      <p className="season-legend-explanation">
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
      <HorizontalDragScroll>
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
                <td>
                  <PlayerProfileLink
                    className="season-player-profile-link"
                    dotaId={row.dotaId}
                    nickname={row.nickname}
                  />
                </td>
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
      </HorizontalDragScroll>
      )}
    </section>
  );
}

function PlayerIdentityCells({
  dotaId,
  nickname,
  avatarUrl,
}: {
  dotaId: string;
  nickname: string;
  avatarUrl: string | null;
}) {
  return (
    <>
      <td className="season-player-avatar-column">
        <PlayerProfileLink
          className="season-player-avatar-link"
          dotaId={dotaId}
          nickname={nickname}
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={34} height={34} unoptimized />
          ) : (
            <i>{nickname.slice(0, 1).toUpperCase()}</i>
          )}
        </PlayerProfileLink>
      </td>
      <td className="season-player-name-column">
        <PlayerProfileLink
          className="season-player-name-link"
          dotaId={dotaId}
          nickname={nickname}
        >
          <strong>{nickname}</strong>
        </PlayerProfileLink>
      </td>
    </>
  );
}
