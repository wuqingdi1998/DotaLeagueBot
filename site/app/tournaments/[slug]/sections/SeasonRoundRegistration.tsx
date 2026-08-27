"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { FiArrowDown, FiArrowUp, FiClock } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import { useServerClock } from "@/hooks/useServerClock";
import {
  SEASON_PRIMARY_ROLE_WINS_REQUIRED,
  SEASON_SECONDARY_ROLE_WINS_REQUIRED,
  type RankedWinSnapshot,
} from "@/lib/season-ranked-wins/model";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth, formatTime } from "../model/formatters";
import {
  buildStratzRankedMatchesUrl,
  formatSeasonRankedWinsRefreshCountdown,
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
  const rankedWinsRefreshCountdown =
    formatSeasonRankedWinsRefreshCountdown(round.registrations, currentTime);

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
  const myRankedWins = data.user ? season.data?.myRankedWins ?? null : null;
  const hasFreshRankedWins = Boolean(
    myRankedWins && currentTime < new Date(myRankedWins.availableUntil).getTime(),
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
        <div className="season-round-registration-copy">
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
          <div className="season-round-registration-actions">
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
            {!round.is_registered && (
              <button
                className="secondary-button compact season-ranked-wins-button"
                type="button"
                disabled={season.checkingRankedWins || hasFreshRankedWins}
                onClick={() => void season.checkMyRankedWins()}
              >
                {rankedWinsButtonLabel(
                  season.checkingRankedWins,
                  hasFreshRankedWins ? myRankedWins : null,
                )}
              </button>
            )}
          </div>
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
        <div className="season-registration-table">
          <div className="season-registration-columns">
            <span />
            <span>Игрок</span>
            <span>Тир</span>
            <span>Роли</span>
            <span className="season-registration-column-wins">
              <span className="season-registration-refresh-timer" tabIndex={0}>
                Рейтинговые победы за 30 дней
                <span
                  className="season-registration-refresh-tooltip"
                  role="tooltip"
                >
                  {rankedWinsRefreshCountdown
                    ? `До следующей проверки всех участников: ${rankedWinsRefreshCountdown}`
                    : "Ожидаем первую проверку всех участников"}
                </span>
              </span>
            </span>
            <span className="season-registration-column-created">
              Регистрация
            </span>
          </div>
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
                <span className="season-registration-wins">
                  {registration.primary_wins === null ||
                  registration.secondary_wins === null
                    ? "Нет данных"
                    : <a
                        href={buildStratzRankedMatchesUrl(
                          registration.dota_id,
                          currentTime,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Открыть рейтинговые матчи игрока за 30 дней на STRATZ"
                      >
                        Осн. {registration.primary_wins}/
                        {SEASON_PRIMARY_ROLE_WINS_REQUIRED} · Доп. {registration.secondary_wins}/
                        {SEASON_SECONDARY_ROLE_WINS_REQUIRED}
                      </a>}
                </span>
                <time dateTime={registration.created_at}>
                  <FiClock aria-hidden="true" />
                  {formatSeasonRegistrationMoment(registration.created_at)} МСК
                </time>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="season-registration-empty">
          На этот тур пока никто не зарегистрировался.
        </p>
      )}
    </section>
  );
}

function rankedWinsButtonLabel(
  isLoading: boolean,
  snapshot: RankedWinSnapshot | null,
) {
  if (isLoading) return "Загружаем победы…";
  if (!snapshot) return "Мои рейтинговые победы за 30 дней";
  return `Осн. (${snapshot.primaryRole}) ${snapshot.primaryWins}/${SEASON_PRIMARY_ROLE_WINS_REQUIRED} · Доп. (${snapshot.secondaryRole}) ${snapshot.secondaryWins}/${SEASON_SECONDARY_ROLE_WINS_REQUIRED}`;
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
