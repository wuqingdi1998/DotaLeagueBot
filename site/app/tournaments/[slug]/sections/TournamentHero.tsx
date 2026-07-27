"use client";

import Image from "next/image";
import { FiArrowRight } from "react-icons/fi";
import { dayCountLabel } from "@/lib/countdown";
import { isPastTournament } from "@/lib/tournaments";
import { tournamentCompetitionStages } from "@/lib/tournament-stages";
import { useTournament } from "../hooks/TournamentContext";
import {
  formatDayMonth,
  formatShortDate,
} from "../model/formatters";

export function TournamentHero() {
  const {
    data,
    openRegistration,
    openTournamentTab,
    registrationAvailable,
  } = useTournament();
  if (!data) return null;

  const { tournament } = data;
  const isPast = isPastTournament(tournament.status);
  const canRegister =
    tournament.status === "registration" && registrationAvailable;
  const competitionStages = tournamentCompetitionStages(tournament);
  const participationApplication = data.user
    ? data.applications.find((application) =>
        application.members.some(
          (member) => member.discord_id === data.user?.discordId,
        ),
      )
    : null;
  const participationConfirmed =
    participationApplication?.status === "approved";
  const participationPending =
    !isPast &&
    participationApplication &&
    ["pending", "awaiting_members"].includes(participationApplication.status);
  const participationMessage = !data.user
    ? "Войдите через Discord, чтобы увидеть свой статус участия"
    : participationConfirmed
      ? `Вы ${isPast ? "участвовали" : "участвуете"} в этом турнире в команде ${participationApplication.team_name}`
      : participationPending
        ? `Ваша команда ${participationApplication.team_name} ожидает допуска к турниру`
        : `Вы ${isPast ? "не участвовали" : "не участвуете"} в этом турнире`;

  return (
    <>
      <section className="hero" id="top">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <div className="status-pill">
            <i />
            {tournament.status_label}
          </div>
          <p className="eyebrow">{tournament.eyebrow}</p>
          <h1>
            {tournament.headline}
            <span>{tournament.headline_accent}</span>
          </h1>
          <p className="hero-description">{tournament.description}</p>
          <div className="hero-buttons">
            {canRegister ? (
              <button className="primary-button" onClick={openRegistration}>
                Зарегистрировать команду <FiArrowRight />
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() =>
                  openTournamentTab(isPast ? "playoffs" : "matches")
                }
              >
                {isPast ? "Смотреть результаты" : "Смотреть матчи"}{" "}
                <FiArrowRight />
              </button>
            )}
            <button
              className="secondary-button"
              onClick={() => openTournamentTab("overview")}
            >
              Подробнее о турнире
            </button>
          </div>
          <p className="hero-footnote">
            {canRegister
              ? `Состав из ${tournament.team_size} игроков · участие бесплатное · регистрация до ${formatDayMonth(tournament.registration_deadline)}`
              : isPast
                ? "Турнир завершён · результаты и история матчей сохранены"
                : `Состав из ${tournament.team_size} игроков · ${tournament.status_label}`}
          </p>
        </div>

        <div className="hero-poster" aria-label={`Афиша ${tournament.name}`}>
          <div className="poster-heading">
            <span>{tournament.name}</span>
          </div>
          <div className="poster-logo-wrap">
            <div className="poster-ring" />
            <Image
              src="/linkens-sphere-logo.png"
              alt=""
              width={155}
              height={155}
              priority
              unoptimized
            />
          </div>
          <div className="poster-dates">
            <strong>
              {formatDayMonth(tournament.start_at)} —{" "}
              {formatDayMonth(tournament.end_at)}
            </strong>
            <span>{new Date(tournament.start_at).getFullYear()}</span>
          </div>
          <div className="poster-meta">
            <div>
              <small>Формат</small>
              <strong>{tournament.format}</strong>
            </div>
            <div>
              <small>Слотов</small>
              <strong>{tournament.max_teams} команд</strong>
            </div>
          </div>
          <div
            className={`poster-participation${
              participationConfirmed
                ? " confirmed"
                : participationPending
                  ? " pending"
                  : ""
            }`}
          >
            <span aria-hidden="true" />
            <p>{participationMessage}</p>
          </div>
        </div>
      </section>

      <section
        className={`quick-facts${
          competitionStages.length === 2 ? " quick-facts-two" : ""
        }`}
        aria-label="Этапы турнира"
      >
        {competitionStages.map((stage, index) => (
          <div key={stage.key}>
            <span>{index + 1}</span>
            <strong>{stage.description}</strong>
          </div>
        ))}
      </section>

    </>
  );
}

export function TournamentHeading() {
  const { data, daysLeft } = useTournament();
  if (!data) return null;

  const { tournament } = data;
  const isPast = isPastTournament(tournament.status);

  return (
    <div className="section-heading">
      <div className="tournament-heading-copy">
        {!isPast && <p className="section-kicker">Турнир сообщества</p>}
        <h2>{tournament.name}</h2>
        <p className="tournament-heading-dates">
          {formatShortDate(tournament.start_at)} —{" "}
          {formatShortDate(tournament.end_at)}
        </p>
      </div>
      <div className={isPast ? "tournament-status archived" : "countdown"}>
        {isPast ? (
          tournament.status === "archived" ? (
            "Архив"
          ) : (
            "Завершён"
          )
        ) : (
          <>
            <span>До начала</span>
            <strong>{daysLeft}</strong>
            <span>{dayCountLabel(daysLeft)}</span>
          </>
        )}
      </div>
    </div>
  );
}
