"use client";

import Link from "next/link";
import {
  FiArchive,
  FiArrowRight,
  FiCalendar,
  FiEdit3,
} from "react-icons/fi";
import {
  isPastTournament,
  type TournamentStatus,
} from "@/lib/tournaments";
import {
  formatDateRange,
  statusDetails,
  type TournamentSummary,
} from "./tournament-hub-model";

export function TournamentCard({
  tournament,
  isAdmin,
  onStatusChange,
}: {
  tournament: TournamentSummary;
  isAdmin: boolean;
  onStatusChange: (id: number, status: TournamentStatus) => Promise<void>;
}) {
  const isPast = isPastTournament(tournament.status);

  return (
    <article className={`tournament-card status-${tournament.status}`}>
      <div className="tournament-card-top">
        <h2>{tournament.name}</h2>
        <span className={`tournament-status ${tournament.status}`}>
          {tournament.status === "active" && <i />}
          {statusDetails[tournament.status].label}
        </span>
      </div>
      <p className="tournament-card-description">{tournament.description}</p>
      <div className="tournament-card-date">
        <FiCalendar aria-hidden="true" />
        <strong>
          {formatDateRange(tournament.start_at, tournament.end_at)}
        </strong>
      </div>
      <dl className="tournament-card-stats">
        <div>
          <dt>Формат</dt>
          <dd>{tournament.format}</dd>
        </div>
        <div>
          <dt>Команды</dt>
          <dd>
            {tournament.team_count}
            {!isPast && ` / ${tournament.max_teams}`}
          </dd>
        </div>
        <div>
          <dt>Результаты</dt>
          <dd>
            {tournament.finished_match_count} из {tournament.match_count} матчей
          </dd>
        </div>
      </dl>
      <div className="tournament-card-actions">
        <Link
          className="primary-button compact"
          href={`/tournaments/${tournament.slug}`}
        >
          {isPast ? "Результаты" : "Открыть турнир"} <FiArrowRight />
        </Link>
        {isAdmin && (
          <>
            <Link
              className="secondary-button compact"
              href={`/tournaments/${tournament.slug}?manage=1`}
            >
              <FiEdit3 /> Управление
            </Link>
            {tournament.status === "finished" && (
              <button
                className="text-action"
                onClick={() =>
                  void onStatusChange(tournament.id, "archived")
                }
              >
                <FiArchive /> В архив
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
