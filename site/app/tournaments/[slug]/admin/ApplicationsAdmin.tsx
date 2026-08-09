"use client";

import Image from "next/image";
import Link from "next/link";
import { roleOptions } from "../model/constants";
import { useTournament } from "../hooks/TournamentContext";
import { getTeamPlayers, initials } from "../model/formatters";

export function ApplicationsAdmin() {
  const { data, updateApplicationStatus } = useTournament();
  if (!data) return null;

  return (
    <section className="applications-panel">
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Регистрация</p>
          <h3>Заявки команд</h3>
        </div>
      </div>
      <div className="application-list">
        {data.applications.map((application) => (
          <article className="application-row" key={application.id}>
            {application.logo_key ? (
              <Image
                className="team-emblem small"
                src={`/api/team-emblems/${application.logo_key}`}
                alt=""
                width={48}
                height={48}
                unoptimized
              />
            ) : (
              <div className="team-avatar small">
                {initials(application.team_name)}
              </div>
            )}
            <div className="application-copy">
              <span className={`status-badge ${application.status}`}>
                {application.status === "approved"
                  ? "Допущена"
                  : application.status === "declined"
                    ? "Отклонена"
                    : application.status === "awaiting_members"
                      ? "Ждёт подтверждений игроков"
                      : "Новая заявка"}
              </span>
              <h4>
                {application.team_name} <small>[{application.tag}]</small>
              </h4>
              <p>
                Капитан: {application.captain} · {application.contact}
              </p>
              <ul className="application-roster-links">
                {getTeamPlayers(application).map((player) => {
                  const role = roleOptions.find(
                    (option) => option.value === player.role,
                  );
                  return (
                    <li key={`${application.id}-${player.name}`}>
                      <span>{player.role === "coach" ? "Т" : (role?.position ?? "—")}.</span>
                      {player.dotaId ? (
                        <Link href={`/players/${player.dotaId}`}>
                          {player.name}
                        </Link>
                      ) : player.archiveIdentityId ? (
                        <Link href={`/archive-players/${player.archiveIdentityId}`}>
                          {player.name}
                        </Link>
                      ) : (
                        <b>{player.name}</b>
                      )}
                      {player.isCaptain && <small>капитан</small>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="application-actions">
              <button
                disabled={application.status === "approved"}
                onClick={() =>
                  void updateApplicationStatus(application.id, "approved")
                }
              >
                Допустить
              </button>
              <button
                className="danger"
                disabled={application.status === "declined"}
                onClick={() =>
                  void updateApplicationStatus(application.id, "declined")
                }
              >
                Отклонить
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
