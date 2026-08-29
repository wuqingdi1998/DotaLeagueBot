"use client";

import Image from "next/image";
import { isPastTournament } from "@/lib/tournaments";
import { useTournament } from "../hooks/TournamentContext";
import {
  formatDayMonth,
  formatTime,
  initials,
} from "../model/formatters";

const bracketLabels = {
  group: "Группы",
  upper: "Верхняя сетка",
  lower: "Нижняя сетка",
  grand_final: "Гранд-финал",
} as const;

type MatchTeamEmblemProps = {
  logoKey: string | null | undefined;
  teamName: string;
};

function MatchTeamEmblem({ logoKey, teamName }: MatchTeamEmblemProps) {
  if (logoKey) {
    return (
      <Image
        className="match-team-emblem"
        src={`/api/team-emblems/${logoKey}`}
        alt=""
        width={36}
        height={36}
        unoptimized
      />
    );
  }

  return <i aria-hidden="true">{initials(teamName)}</i>;
}

export function MatchesPanel() {
  const { activeTab, data } = useTournament();
  if (!data || activeTab !== "matches") return null;

  const isPast = isPastTournament(data.tournament.status);
  const applicationsById = new Map(
    data.applications.map((application) => [application.id, application]),
  );

  return (
    <div className="tab-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Расписание</p>
          <h3>{isPast ? "Результаты матчей" : "Ближайшие матчи"}</h3>
        </div>
        <span className="timezone">Московское время · UTC+3</span>
      </div>
      <div className="matches-list">
        {data.matches.map((match) => {
          const teamA = match.team_a_application_id === null
            ? null
            : applicationsById.get(match.team_a_application_id);
          const teamB = match.team_b_application_id === null
            ? null
            : applicationsById.get(match.team_b_application_id);

          return (
            <article className="match-row" key={match.id}>
              <div className="match-date">
                <strong>
                  <time dateTime={match.scheduled_at}>
                    {formatTime(match.scheduled_at)}
                  </time>
                </strong>
                <span>
                  <time dateTime={match.scheduled_at}>
                    {formatDayMonth(match.scheduled_at)}
                  </time>
                </span>
              </div>
              <div className="match-stage">
                {match.stage}
                {match.bracket_side && (
                  <small>
                    {bracketLabels[match.bracket_side]}
                    {match.bracket_round
                      ? ` · раунд ${match.bracket_round}`
                      : ""}
                  </small>
                )}
              </div>
              <div className="match-team first">
                <MatchTeamEmblem
                  logoKey={teamA?.logo_key}
                  teamName={match.team_a}
                />
                <strong>{match.team_a}</strong>
              </div>
              <div className="match-score">
                {match.team_a_result_label ??
                  (match.team_a_score === null ? "—" : match.team_a_score)}
                <span>:</span>
                {match.team_b_result_label ??
                  (match.team_b_score === null ? "—" : match.team_b_score)}
              </div>
              <div className="match-team second">
                <strong>{match.team_b}</strong>
                <MatchTeamEmblem
                  logoKey={teamB?.logo_key}
                  teamName={match.team_b}
                />
              </div>
              <span className="best-of">BO{match.best_of}</span>
              {match.decision_note && (
                <p className="match-decision-note">{match.decision_note}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
