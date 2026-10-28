"use client";

import { useState } from "react";
import { AvatarImage } from "@/app/components/AvatarImage";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import type { SeasonStanding } from "@/lib/season";
import { seasonCoolingRoundLimit } from "@/lib/season-cooling";
import { sortSeasonPenaltyEvents } from "@/lib/season-penalty-event-order";
import {
  compareSeasonPenaltyStages,
  compareSeasonStandingPerformance,
} from "@/lib/season-standings-order";
import { useTournament } from "../hooks/TournamentContext";
import type {
  SeasonCoolingProgress,
  SeasonPenaltyEvent,
  SeasonRound,
} from "../model/season-types";
import { HorizontalDragScroll } from "../components/HorizontalDragScroll";
import { SeasonCoolingCell, SeasonCoolingHeader } from "../components/SeasonCoolingColumn";
import { SeasonStandingsInfo } from "../components/SeasonStandingsInfo";

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
  const inactiveRows = standings
    .filter((row) => row.section === "inactive")
    .sort(compareSeasonStandingPerformance);

  return (
    <div className="tab-panel season-standings-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Общий зачёт</p>
          <h3>Таблица сезона</h3>
        </div>
        <div className="season-standings-actions">
          <SeasonStandingsInfo hasActivityPoints={standings.some((row) => row.hasActivityPoints)}
            activityPointsNote={data.tournament.season_activity_points_note} />
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
      </div>
      {!rounds.length ? (
        <div className="empty-standings">
          Таблица появится после публикации первого тура.
        </div>
      ) : (
        <>
          <div className="season-standings-layout">
            <StandingsTable rows={activeRows} rounds={rounds} isRanked />
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
          <SeasonPenaltyTable
            coolingProgress={season.data.coolingProgress}
            events={season.data.penaltyEvents.filter((event) =>
              rounds.some((round) => round.id === event.round_id) &&
              event.fire_count > 0,
            )}
            rows={standings}
          />
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
  const showsActivityPoints = rows.some((row) => row.hasActivityPoints);
  return (
    <HorizontalDragScroll>
      <table className="season-standings-table">
        <thead>
          <tr>
            <th className="season-place-column">Место</th>
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
            {showsActivityPoints && (
              <th className="season-compact-column">+ap</th>
            )}
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
              <td className="season-place-column">{isRanked ? index + 1 : "—"}</td>
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
              {showsActivityPoints && (
                <td className="season-compact-column season-activity-points">
                  {row.hasActivityPoints
                    ? `${row.activityPoints > 0 ? "+" : ""}${row.activityPoints}`
                    : ""}
                </td>
              )}
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
                    ) : cell &&
                      ["win", "draw", "loss"].includes(cell.outcome) ? (
                      <span
                        className={`season-result-cell ${cell.outcome}`}
                        title="Результат перенесён из итоговой таблицы; состав матча не сохранился"
                      >
                        {cell.points}
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

function SeasonPenaltyTable({
  coolingProgress,
  events,
  rows,
}: {
  coolingProgress: SeasonCoolingProgress[];
  events: SeasonPenaltyEvent[];
  rows: SeasonStanding[];
}) {
  const penalized = rows
    .filter((row) => row.penaltyFires > 0)
    .sort(compareSeasonPenaltyStages);
  const coolingByPlayer = new Map(
    coolingProgress.map((entry) => [entry.player_id, entry]),
  );
  return (
    <section className="season-penalty-table-section">
      <h4>Штраф очков</h4>
      <p>
        Каждые 5 огоньков: −1 рейтинговое очко и пропуск следующего тура.
        После {seasonCoolingRoundLimit} завершённых туров без новых огоньков и внесения всех результатов
        организатор может снять один огонёк.
        Охлаждение останавливается на 0, 5, 10 или 15 огоньках.
        Уже назначенные штрафы за достигнутые лимиты сохраняются.
      </p>
      {!penalized.length ? (
        <p className="season-empty-copy">Штрафных огоньков пока нет.</p>
      ) : (
      <div className="season-table-scroll">
        <table className="season-penalty-table">
          <thead>
            <tr>
              <th>Игрок</th>
              <SeasonCoolingHeader />
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
                <SeasonCoolingCell
                  playerId={row.playerId}
                  playerName={row.nickname}
                  progress={coolingByPlayer.get(row.playerId)}
                />
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
      {events.length > 0 && (
        <SeasonPenaltyHistory events={events} rows={rows} />
      )}
    </section>
  );
}

function SeasonPenaltyHistory({
  events,
  rows,
}: {
  events: SeasonPenaltyEvent[];
  rows: SeasonStanding[];
}) {
  const orderedEvents = sortSeasonPenaltyEvents(events, "round");
  const playersById = new Map(rows.map((row) => [row.playerId, row]));
  return (
    <section className="season-penalty-history">
      <h5>История штрафных огоньков</h5>
      <div className="season-table-scroll">
        <table className="season-penalty-table season-penalty-history-table">
          <thead>
            <tr>
              <th>Тур</th>
              <th>Игрок</th>
              <th>Огоньки</th>
              <th>Причина</th>
            </tr>
          </thead>
          <tbody>
            {orderedEvents.map((event) => (
              <tr key={event.id}>
                <td>Тур {event.round_number}</td>
                <td>
                  <PlayerProfileLink
                    dotaId={playersById.get(event.player_id)?.dotaId ?? ""}
                    nickname={event.nickname}
                  />
                </td>
                <td>🔥 {event.fire_count}</td>
                <td>{event.note || "Причина не указана"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          <AvatarImage
            source={avatarUrl}
            alt=""
            width={32}
            height={32}
            unoptimized
            fallback={<i>{nickname.slice(0, 1).toUpperCase()}</i>}
          />
        </PlayerProfileLink>
      </td>
      <td className="season-player-name-column">
        <PlayerProfileLink
          className="season-player-name-link"
          dotaId={dotaId}
          nickname={nickname}
          showClanBadge
        >
          <strong>{nickname}</strong>
        </PlayerProfileLink>
      </td>
    </>
  );
}
