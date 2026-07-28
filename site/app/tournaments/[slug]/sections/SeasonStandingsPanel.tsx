"use client";

import Image from "next/image";
import { useState } from "react";
import { useTournament } from "../hooks/TournamentContext";

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
  const allRounds = season.data.rounds;
  const rounds = (
    showPreview ? allRounds : allRounds.filter((round) => round.is_visible)
  ).sort((left, right) => left.round_number - right.round_number);
  const standings =
    showPreview && season.data.previewStandings
      ? season.data.previewStandings
      : season.data.standings;

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
                <th>Очки</th>
                {rounds.map((round) => (
                  <th key={round.id}>Тур {round.round_number}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr key={row.playerId}>
                  <td>{index + 1}</td>
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
                  <td><strong>{row.points}</strong></td>
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
                            title={`Открыть ${
                              cell.matchIds.length > 1
                                ? `${cell.matchIds.length} матча`
                                : "матч"
                            }`}
                          >
                            {cell.outcome === "pending" ? "…" : cell.points}
                          </button>
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
      )}
    </div>
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
