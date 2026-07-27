"use client";

import Image from "next/image";
import Link from "next/link";
import { FaCrown } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { isPastTournament } from "@/lib/tournaments";
import { RoleIcon } from "../components/RoleField";
import { useTournament } from "../hooks/TournamentContext";
import { getTeamPlayers, initials } from "../model/formatters";

export function TeamsPanel() {
  const {
    activeTab,
    approvedTeams,
    data,
    openRegistration,
    registrationAvailable,
  } = useTournament();
  if (!data || activeTab !== "teams") return null;

  const { tournament } = data;
  const canRegister =
    !isPastTournament(tournament.status) &&
    tournament.status === "registration" &&
    registrationAvailable;

  return (
    <div className="tab-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Участники</p>
          <h3>Подтверждённые команды</h3>
        </div>
        {canRegister && (
          <button
            className="primary-button compact"
            onClick={openRegistration}
          >
            Подать заявку <FiArrowRight />
          </button>
        )}
      </div>
      <div className="teams-grid">
        {data.applications
          .filter((team) => team.status !== "declined")
          .map((team) => (
            <article className="team-card" key={team.id}>
              <div className="team-card-head">
                {team.logo_key ? (
                  <Image
                    className="team-emblem"
                    src={`/api/team-emblems/${team.logo_key}`}
                    alt={`Эмблема команды ${team.team_name}`}
                    width={60}
                    height={60}
                    unoptimized
                  />
                ) : (
                  <div className="team-avatar">
                    {initials(team.team_name)}
                  </div>
                )}
                <span className={`status-badge ${team.status}`}>
                  {team.status === "approved"
                    ? "Допущена"
                    : team.status === "awaiting_members"
                      ? "Ждёт игроков"
                      : "На проверке"}
                </span>
              </div>
              <p className="team-tag">{team.tag}</p>
              <h3>{team.team_name}</h3>
              <div className="team-archive-meta">
                <span>{team.selection_method}</span>
                {team.team_tier_total_snapshot !== null && (
                  <span>Тир команды: {team.team_tier_total_snapshot}</span>
                )}
              </div>
              {(team.result_label || team.placement) && (
                <div className="team-result-badge">
                  {team.result_label || `${team.placement}-е место`}
                </div>
              )}
              <ul>
                {getTeamPlayers(team).map((player) => (
                  <li key={`${team.id}-${player.name}`}>
                    <RoleIcon role={player.role} />
                    {player.dotaId ? (
                      <Link
                        className="player-name player-profile-link"
                        href={`/players/${player.dotaId}`}
                      >
                        {player.name}
                      </Link>
                    ) : (
                      <span className="player-name">{player.name}</span>
                    )}
                    {player.isCaptain && (
                      <small className="captain-badge">
                        <FaCrown aria-hidden="true" /> капитан
                      </small>
                    )}
                    {player.tier !== null && (
                      <small className="player-tier">тир {player.tier}</small>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        {canRegister && approvedTeams.length < tournament.max_teams && (
          <button className="empty-team" onClick={openRegistration}>
            <span>+</span>
            <strong>Свободный слот</strong>
            <small>Зарегистрировать команду</small>
          </button>
        )}
      </div>
    </div>
  );
}
