"use client";

import { FiCheckCircle, FiClock } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth, formatTime } from "../model/formatters";
import type { SeasonRound } from "../model/season-types";

export function SeasonRoundCheckIn({
  currentTime,
  round,
}: {
  currentTime: number;
  round: SeasonRound;
}) {
  const { data, season, startDiscordLogin } = useTournament();
  if (
    !data ||
    !round.check_in_available ||
    !round.check_in_opens_at ||
    !round.check_in_closes_at
  ) {
    return null;
  }
  const opensAt = new Date(round.check_in_opens_at).getTime();
  const closesAt = new Date(round.check_in_closes_at).getTime();
  const isOpen = currentTime >= opensAt && currentTime < closesAt;
  if (!isOpen && currentTime < opensAt) return null;

  return (
    <div className="season-round-check-in">
      <div>
        {round.is_checked_in ? (
          <FiCheckCircle aria-hidden="true" />
        ) : (
          <FiClock aria-hidden="true" />
        )}
        <span>
          <strong>
            {round.is_checked_in
              ? "Чек-ин пройден"
              : isOpen
                ? "Чек-ин тура открыт"
                : "Чек-ин завершён"}
          </strong>
          <small>
            До{" "}
            <time dateTime={round.check_in_closes_at}>
              {formatDayMonth(round.check_in_closes_at)} ·{" "}
              {formatTime(round.check_in_closes_at)}
            </time>
          </small>
        </span>
      </div>
      {!data.user && isOpen ? (
        <button
          className="primary-button compact"
          type="button"
          onClick={() => startDiscordLogin()}
        >
          Войти и пройти чек-ин
        </button>
      ) : round.is_registered ? (
        <button
          id={`season-check-in-${round.id}`}
          className="primary-button compact"
          type="button"
          disabled={!isOpen || round.is_checked_in || season.checkInRoundId !== null}
          onClick={() => void season.checkIn(round.id)}
        >
          {season.checkInRoundId === round.id
            ? "Сохраняем…"
            : round.is_checked_in
              ? "Чек-ин пройден"
              : "Пройти чек-ин"}
        </button>
      ) : (
        <span className="season-check-in-unavailable">
          Чек-ин доступен зарегистрированным участникам
        </span>
      )}
    </div>
  );
}
