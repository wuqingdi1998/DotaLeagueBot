"use client";

import Image from "next/image";
import { FiCalendar } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth } from "../model/formatters";

export function SeasonOverviewPanel() {
  const { activeTab, data, season } = useTournament();
  const seasonData = season.data;
  if (
    !data ||
    data.tournament.tournament_type !== "seasonal" ||
    activeTab !== "overview"
  ) {
    return null;
  }
  if (!seasonData) return <SeasonLoadState />;

  const publishedRounds = seasonData.rounds.filter(
    (round) => round.is_visible && round.round_kind === "regular",
  );
  const orderedMatches = publishedRounds
    .flatMap((round) => round.lobbies.flatMap((lobby) => lobby.matches))
    .filter((match) => match.status === "completed")
    .sort(
      (left, right) =>
        new Date(right.scheduled_at ?? 0).getTime() -
        new Date(left.scheduled_at ?? 0).getTime(),
    );
  const leaders = seasonData.standings
    .filter((row) => row.section === "active")
    .slice(0, 5);
  const currentRound =
    publishedRounds.find((round) => round.status === "active") ??
    publishedRounds.toReversed().find((round) => round.status === "completed");
  const nextRound = publishedRounds
    .filter(
      (round) =>
        round.status === "planned" &&
        round.scheduled_at &&
        new Date(round.scheduled_at).getTime() >=
          new Date(seasonData.generatedAt).getTime(),
    )
    .toSorted(
      (left, right) =>
        new Date(left.scheduled_at ?? 0).getTime() -
        new Date(right.scheduled_at ?? 0).getTime(),
    )[0];

  return (
    <div className="tab-panel season-overview-panel">
      <section className="season-overview-intro">
        <Image
          src="/linkens-sphere-logo.png"
          alt=""
          width={84}
          height={84}
          unoptimized
        />
        <div>
          <p className="card-kicker">Сезонный турнир</p>
          <h3>{data.tournament.name}</h3>
          <p>{data.tournament.about || data.tournament.description}</p>
          <span>
            <FiCalendar aria-hidden="true" />
            {formatDayMonth(data.tournament.start_at)} —{" "}
            {formatDayMonth(data.tournament.end_at)} ·{" "}
            {data.tournament.status_label}
          </span>
        </div>
      </section>
      <section className="season-summary-grid">
        <SummaryValue label="Участников" value={seasonData.participants.length} />
        <SummaryValue
          label="Всего туров"
          value={data.tournament.season_round_count}
        />
        <SummaryValue label="Опубликовано" value={publishedRounds.length} />
        <SummaryValue
          label="Текущий тур"
          value={currentRound ? currentRound.round_number : "—"}
        />
        <SummaryValue
          label="Ближайший тур"
          value={nextRound ? nextRound.round_number : "—"}
        />
      </section>
      <div className="season-overview-columns">
        <section className="season-content-card">
          <p className="card-kicker">Последние результаты</p>
          <h3>Недавние матчи</h3>
          {orderedMatches.length ? (
            <div className="season-compact-results">
              {orderedMatches.slice(0, 5).map((match) => (
                <button
                  key={match.id}
                  onClick={() =>
                    season.openRound(match.round_number, match.id)
                  }
                >
                  <span>
                    Тур {match.round_number} · {match.lobby_name}
                  </span>
                  <strong>
                    {match.team_a_name} {match.team_a_score ?? "—"} :{" "}
                    {match.team_b_score ?? "—"} {match.team_b_name}
                  </strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="season-empty-copy">
              Завершённых опубликованных матчей пока нет.
            </p>
          )}
        </section>
        <section className="season-content-card">
          <p className="card-kicker">Лидеры</p>
          <h3>Краткая таблица</h3>
          {leaders.length ? (
            <ol className="season-leaders">
              {leaders.map((row, index) => (
                <li key={row.playerId}>
                  <b>{index + 1}</b>
                  <span>{row.nickname}</span>
                  <strong>{row.points} оч.</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="season-empty-copy">
              Таблица появится после публикации первого тура.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryValue({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SeasonLoadState() {
  const { season } = useTournament();
  return (
    <div className="tab-panel empty-standings">
      {season.error ||
        (season.loading ? "Загружаем сезон…" : "Данные сезона пока недоступны")}
    </div>
  );
}
