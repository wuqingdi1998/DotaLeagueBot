"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { FiArrowDown, FiArrowUp, FiClock } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import { useServerClock } from "@/hooks/useServerClock";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth, formatTime } from "../model/formatters";
import {
  formatSeasonRegistrationMoment,
  sortSeasonRegistrations,
  type SeasonRegistrationDirection,
  type SeasonRegistrationSort,
} from "../model/season-registration";
import type { SeasonRound } from "../model/season-types";
import { SeasonRoundCheckIn } from "./SeasonRoundCheckIn";

export function SeasonRoundRegistration({ round }: { round: SeasonRound }) {
  const { data, season, startDiscordLogin } = useTournament();
  const [sort, setSort] = useState<SeasonRegistrationSort>("createdAt");
  const [direction, setDirection] =
    useState<SeasonRegistrationDirection>("ascending");
  const currentTime = useServerClock(season.data?.generatedAt);
  const registrations = useMemo(
    () => sortSeasonRegistrations(round.registrations, sort, direction),
    [direction, round.registrations, sort],
  );

  if (!data) return null;

  const registrationOpen = Boolean(
    round.registration_open &&
      round.registration_deadline &&
      currentTime < new Date(round.registration_deadline).getTime(),
  );
  const cancellationOpen = Boolean(
    round.cancellation_open &&
      round.cancellation_deadline &&
      currentTime < new Date(round.cancellation_deadline).getTime(),
  );

  function changeSort(nextSort: SeasonRegistrationSort) {
    if (nextSort === sort) {
      setDirection((current) =>
        current === "ascending" ? "descending" : "ascending",
      );
      return;
    }
    setSort(nextSort);
    setDirection("ascending");
  }

  const actionDisabled = round.is_registered
    ? !cancellationOpen
    : !registrationOpen;
  const actionLabel = !round.is_registered
    ? registrationOpen
      ? "Зарегистрироваться"
      : "Регистрация закрыта"
    : cancellationOpen
      ? "Отменить регистрацию"
      : "Отмена регистрации закрыта";

  return (
    <section className="season-registration-section">
      <div className="season-round-registration">
        <div>
          <strong>Регистрация на тур</strong>
          <span>
            {round.registration_deadline
              ? <>
                  Регистрация до{" "}
                  <time dateTime={round.registration_deadline}>
                    {formatDayMonth(round.registration_deadline)} ·{" "}
                    {formatTime(round.registration_deadline)}
                  </time>
                </>
              : "Откроется после назначения даты тура"}
          </span>
          <small>
            Зарегистрировано: {round.registration_count}. Отмена доступна до{" "}
            {round.cancellation_deadline
              ? <time dateTime={round.cancellation_deadline}>
                  {formatDayMonth(round.cancellation_deadline)} ·{" "}
                  {formatTime(round.cancellation_deadline)}
                </time>
              : "назначения даты тура"}.
          </small>
        </div>
        {!data.user ? (
          <button
            className="primary-button compact"
            type="button"
            disabled={!registrationOpen}
            onClick={() => startDiscordLogin()}
          >
            Войти, чтобы зарегистрироваться
          </button>
        ) : (
          <button
            className={
              round.is_registered
                ? "secondary-button compact"
                : "primary-button compact"
            }
            type="button"
            disabled={actionDisabled || season.registrationRoundId !== null}
            onClick={() =>
              void season.updateRoundRegistration(
                round.id,
                round.is_registered,
              )
            }
          >
            {season.registrationRoundId === round.id
              ? "Сохраняем…"
              : actionLabel}
          </button>
        )}
      </div>

      <SeasonRoundCheckIn currentTime={currentTime} round={round} />

      <div className="season-registration-list-heading">
        <div>
          <p className="card-kicker">Участники тура</p>
          <h4>Зарегистрированные игроки</h4>
        </div>
        <div className="season-registration-sorts" aria-label="Сортировка списка">
          <SortButton
            active={sort === "createdAt"}
            direction={direction}
            label="По времени"
            onClick={() => changeSort("createdAt")}
          />
          <SortButton
            active={sort === "nickname"}
            direction={direction}
            label="По нику"
            onClick={() => changeSort("nickname")}
          />
          <SortButton
            active={sort === "tier"}
            direction={direction}
            label="По тиру"
            onClick={() => changeSort("tier")}
          />
        </div>
      </div>

      {registrations.length ? (
        <ol className="season-registration-list">
          {registrations.map((registration, index) => (
            <li key={registration.player_id}>
              <span className="season-registration-number">{index + 1}</span>
              <span className="season-registration-player">
                {registration.avatar_url ? (
                  <Image
                    className="season-registration-player-avatar"
                    src={registration.avatar_url}
                    width={30}
                    height={30}
                    alt=""
                    unoptimized
                  />
                ) : (
                  <i className="season-registration-player-avatar">
                    {registration.nickname.slice(0, 1).toUpperCase()}
                  </i>
                )}
                <PlayerProfileLink
                  dotaId={registration.dota_id}
                  nickname={registration.nickname}
                />
              </span>
              <strong className="season-registration-tier">
                {registration.tier_snapshot ?? "—"}
              </strong>
              <span className="season-registration-roles">
                {registration.positions ?? "—"}
              </span>
              <time dateTime={registration.created_at}>
                <FiClock aria-hidden="true" />
                {formatSeasonRegistrationMoment(registration.created_at)} МСК
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="season-registration-empty">
          На этот тур пока никто не зарегистрировался.
        </p>
      )}
    </section>
  );
}

function SortButton({
  active,
  direction,
  label,
  onClick,
}: {
  active: boolean;
  direction: SeasonRegistrationDirection;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      type="button"
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
      {active &&
        (direction === "ascending" ? (
          <FiArrowUp aria-hidden="true" />
        ) : (
          <FiArrowDown aria-hidden="true" />
        ))}
    </button>
  );
}
