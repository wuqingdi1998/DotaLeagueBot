"use client";

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

export function MatchesPanel() {
  const { activeTab, captainApplicationIds, checkIn, data } = useTournament();
  if (!data || activeTab !== "matches") return null;

  const isPast = isPastTournament(data.tournament.status);

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
        {data.matches.map((match) => (
          <article className="match-row" key={match.id}>
            <div className="match-date">
              <strong>{formatTime(match.scheduled_at)}</strong>
              <span>{formatDayMonth(match.scheduled_at)}</span>
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
              <i>{initials(match.team_a)}</i>
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
              <i>{initials(match.team_b)}</i>
            </div>
            <span className="best-of">BO{match.best_of}</span>
            {!isPast && (
              <span className="checkin-state">
                {match.team_a_checked_in || match.team_b_checked_in
                  ? `Готовы: ${[
                      match.team_a_checked_in ? match.team_a : "",
                      match.team_b_checked_in ? match.team_b : "",
                    ]
                      .filter(Boolean)
                      .join(", ")}`
                  : "Готовность ожидается"}
              </span>
            )}
            {data.user &&
              !isPast &&
              match.status === "scheduled" &&
              ((match.team_a_application_id !== null &&
                captainApplicationIds.has(match.team_a_application_id)) ||
                (match.team_b_application_id !== null &&
                  captainApplicationIds.has(match.team_b_application_id))) && (
                <button
                  className="match-checkin"
                  onClick={() => void checkIn(match.id)}
                >
                  Check-in
                </button>
              )}
            {match.decision_note && (
              <p className="match-decision-note">{match.decision_note}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
