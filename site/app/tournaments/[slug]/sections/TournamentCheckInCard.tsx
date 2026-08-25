"use client";

import { FiCheckCircle } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import { formatTimelineMoment } from "../model/formatters";

export function TournamentCheckInCard() {
  const {
    captainApplications,
    checkIn,
    checkInWindow,
    data,
    startDiscordLogin,
  } = useTournament();

  if (!data || !checkInWindow?.shouldShowStatus) return null;

  const captainTeam = captainApplications[0];
  if (data.user && !captainTeam) return null;

  return (
    <article className="content-card tournament-checkin-card">
      <div className="tournament-checkin-copy">
        <FiCheckCircle aria-hidden="true" />
        <div>
          <p className="card-kicker">Чек-ин команды</p>
          <h3>
            {checkInWindow.isOpen
              ? "Подтвердите участие в турнире"
              : checkInWindow.isUpcoming
                ? "Чек-ин скоро откроется"
                : "Чек-ин завершён"}
          </h3>
          <p>
            {checkInWindow.isUpcoming
              ? <>
                  Начало чек-ина —{" "}
                  <time dateTime={checkInWindow.opensAt}>
                    {formatTimelineMoment(checkInWindow.opensAt)}
                  </time>
                  .
                </>
              : "Одного подтверждения капитана достаточно для всей команды."}
          </p>
        </div>
      </div>
      {!data.user && checkInWindow.isOpen && (
        <button className="primary-button compact" onClick={() => startDiscordLogin()}>
          Войти через Discord
        </button>
      )}
      {captainTeam?.is_checked_in && (
        <span className="tournament-checkin-complete">
          <FiCheckCircle aria-hidden="true" /> Прошел чек-ин
        </span>
      )}
      {captainTeam && !captainTeam.is_checked_in && checkInWindow.isOpen && (
        <button
          className="primary-button compact"
          onClick={() => void checkIn(captainTeam.id)}
        >
          Пройти чек-ин
        </button>
      )}
    </article>
  );
}
