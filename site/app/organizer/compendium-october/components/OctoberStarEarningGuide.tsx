"use client";

import { useRef } from "react";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiHelpCircle, FiX } from "react-icons/fi";
import {
  OCTOBER_ABSOLUTE_MAX_STARS,
  OCTOBER_STANDARD_MAX_STARS,
  OCTOBER_STAR_EARNING_SOURCES,
  OCTOBER_SUBSCRIBER_MAX_STARS,
} from "../model/star-earning";
import { SeasonTournamentLinkEditor } from "@/app/season/admin/SeasonTournamentLinkEditor";
import type { SeasonTournamentLinks } from "@/app/season/model/season-overview-model";

export function OctoberStarEarningGuide({
  isOrganizer = false,
  tournamentLinks = {},
}: {
  isOrganizer?: boolean;
  tournamentLinks?: SeasonTournamentLinks;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "october-star-guide-title";

  return (
    <>
      <button
        className="october-star-guide-open"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <FiHelpCircle aria-hidden="true" /> Как получить звёзды?
      </button>

      <dialog
        className="october-clan-standing-dialog october-star-guide-dialog"
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="october-clan-standing-dialog-panel october-star-guide-dialog-panel">
          <header>
            <div>
              <span>Правила компендиума</span>
              <h2 id={titleId}>Все способы получить звёзды</h2>
              <p>5–25 октября · максимум рассчитан за все 21 день</p>
            </div>
            <button
              type="button"
              aria-label="Закрыть способы получения звёзд"
              onClick={() => dialogRef.current?.close()}
            >
              <FiX aria-hidden="true" />
            </button>
          </header>

          <div className="october-star-guide-content">
            <ul className="october-star-guide-list">
              {OCTOBER_STAR_EARNING_SOURCES.map((source) => (
                <li className="october-star-guide-item" key={source.id}>
                  <div>
                    <div className="october-star-guide-item-title">
                      <h3>
                        {source.tournaments ? source.tournaments.map((tournament, index) => {
                          const href = tournamentLinks[tournament.linkId]
                            ?? tournament.fallbackHref;
                          return (
                            <span className="october-star-guide-tournament" key={tournament.linkId}>
                              {index > 0 && <span> и </span>}
                              {href ? (
                                <Link href={href}>{tournament.label}</Link>
                              ) : (
                                tournament.label
                              )}
                            </span>
                          );
                        }) : source.title}
                      </h3>
                      {isOrganizer && source.tournaments?.map((tournament) => {
                        const href = tournamentLinks[tournament.linkId]
                          ?? tournament.fallbackHref;
                        return !href ? (
                          <SeasonTournamentLinkEditor
                            key={tournament.linkId}
                            linkId={tournament.linkId}
                            tournamentTitle={tournament.label}
                          />
                        ) : null;
                      })}
                      {source.subscriberOnly && (
                        <span className="october-star-guide-badge">Для Boosty-подписчиков рун кроме Руны Воды</span>
                      )}
                      {source.tournamentOnly && (
                        <span className="october-star-guide-badge">Участникам турниров</span>
                      )}
                    </div>
                    <p>{source.description}</p>
                    {source.rewardDetails && (
                      <small className="october-star-guide-reward-details">
                        {source.rewardDetails.map((detail) => (
                          <span key={detail.label}>
                            {detail.label}
                            <span className="october-star-guide-reward-stars">
                              <FaStar aria-hidden="true" /> {detail.stars}
                            </span>
                          </span>
                        ))}
                      </small>
                    )}
                  </div>
                  <strong aria-label={`Максимум ${source.maxStars} звёзд`}>
                    <FaStar aria-hidden="true" /> {source.maxStars}
                  </strong>
                </li>
              ))}
            </ul>

            <div className="october-star-guide-totals" aria-label="Максимальное количество звёзд">
              <div>
                <span>Максимум без подписки и Fastcup</span>
                <strong><FaStar aria-hidden="true" /> {OCTOBER_STANDARD_MAX_STARS}</strong>
              </div>
              <div>
                <span>Максимум с Испытанием Рун</span>
                <strong><FaStar aria-hidden="true" /> {OCTOBER_SUBSCRIBER_MAX_STARS}</strong>
              </div>
              <div>
                <span>Абсолютный максимум с двумя победами на Fastcup</span>
                <strong><FaStar aria-hidden="true" /> {OCTOBER_ABSOLUTE_MAX_STARS}</strong>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
