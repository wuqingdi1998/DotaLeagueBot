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
import { formatTournamentDateRange } from "@/lib/tournament-date";
import {
  isSeasonLeague,
  isSeasonalTournament,
} from "@/lib/tournament-type";
import type { TournamentSummary } from "./tournament-hub-model";
import { TournamentStatusBadge } from "./TournamentStatusBadge";

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
  const isSeasonLeagueTournament = isSeasonLeague(tournament.tournament_type);
  const hasSeasonalBadge = isSeasonalTournament(tournament.tournament_type);

  return (
    <article className={`tournament-card status-${tournament.status}`}>
      <div className="tournament-card-top">
        <h2>{tournament.name}</h2>
        <div className="tournament-card-badges">
          {hasSeasonalBadge && (
            <span className="tournament-seasonal-badge">Сезонный</span>
          )}
          <TournamentStatusBadge status={tournament.status} />
        </div>
      </div>
      <p className="tournament-card-description">{tournament.description}</p>
      <div className="tournament-card-date">
        <FiCalendar aria-hidden="true" />
        <strong>
          {formatTournamentDateRange(tournament.start_at, tournament.end_at)}
        </strong>
      </div>
      <dl className="tournament-card-stats">
        <div>
          <dt>Формат</dt>
          <dd>{tournament.format}</dd>
        </div>
        <div>
          <dt>{isSeasonLeagueTournament ? "Участники" : "Команды"}</dt>
          <dd>
            {isSeasonLeagueTournament ? (
              tournament.participant_count
            ) : (
              <>
                {tournament.team_count}
                {!isPast && ` / ${tournament.max_teams}`}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>{isSeasonLeagueTournament ? "Туры" : "Результаты"}</dt>
          <dd>
            {isSeasonLeagueTournament
              ? tournament.season_round_count
              : `${tournament.finished_match_count} из ${tournament.match_count} матчей`}
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
