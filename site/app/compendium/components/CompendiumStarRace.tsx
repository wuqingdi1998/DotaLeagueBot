"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaStar } from "react-icons/fa";
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiExternalLink,
  FiGift,
  FiImage,
  FiLoader,
} from "react-icons/fi";
import type { StarRaceData, StarRaceQuest } from "../model/star-race";
import { HeroChoice } from "./HeroChoice";

function countdownLabel(targetAt: string): string {
  const remaining = Math.max(0, new Date(targetAt).getTime() - Date.now());
  const totalSeconds = Math.ceil(remaining / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  return days > 0 ? `${days} дн. ${clock}` : clock;
}

function StarRaceQuestCard({
  quest,
  countdown,
  isChecking,
  canCheck,
  onCheck,
}: {
  quest: StarRaceQuest;
  countdown: string | null;
  isChecking: boolean;
  canCheck: boolean;
  onCheck: (dateKey: string) => void;
}) {
  const isConfigured = Boolean(quest.title && quest.description);
  return (
    <article
      className={`compendium-star-race-quest ${quest.phase}${
        quest.completion ? " completed" : ""
      }`}
    >
      <header>
        <div>
          <span>{quest.weekday}</span>
          <strong>{quest.dateLabel}</strong>
        </div>
        {quest.rewardStars !== null && (
          <span className="compendium-star-race-reward">
            <FaStar aria-hidden="true" /> {quest.rewardStars}
          </span>
        )}
      </header>
      {isConfigured ? (
        <>
          <h3>{quest.title}</h3>
          <p>{quest.description}</p>
          <div className="compendium-star-race-heroes">
            {quest.heroes.map((hero) => (
              <HeroChoice
                key={hero.id}
                hero={hero}
                isMatched={Boolean(
                  quest.completion?.wins.some((win) => win.hero.id === hero.id),
                )}
              />
            ))}
          </div>
          {quest.completion ? (
            <div className="compendium-star-race-completion" role="status">
              <FiCheck aria-hidden="true" />
              <div>
                <strong>Задание выполнено</strong>
                {quest.completion.wins.map((win) => (
                  <a
                    href={`https://www.opendota.com/matches/${win.matchId}`}
                    target="_blank"
                    rel="noreferrer"
                    key={win.matchId}
                  >
                    {win.hero.name} · матч {win.matchId}
                    <FiExternalLink aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          ) : quest.phase === "active" ? (
            <div className="compendium-star-race-action">
              <div>
                <FiClock aria-hidden="true" />
                <span>До конца задания</span>
                <strong>{countdown}</strong>
              </div>
              <button
                type="button"
                disabled={!canCheck || isChecking}
                onClick={() => onCheck(quest.dateKey)}
              >
                {isChecking ? (
                  <>
                    <FiLoader className="compendium-spinner" aria-hidden="true" />
                    Проверяем…
                  </>
                ) : (
                  "Проверить"
                )}
              </button>
            </div>
          ) : (
            <span className="compendium-star-race-status">
              {quest.phase === "upcoming"
                ? `Откроется ${quest.dateLabel}`
                : "Время выполнения истекло"}
            </span>
          )}
        </>
      ) : (
        <div className="compendium-star-race-empty-quest">
          Задание будет добавлено позже
        </div>
      )}
    </article>
  );
}

export function CompendiumStarRace({
  race,
  checkingDateKey,
  canCheck,
  onCheck,
}: {
  race: StarRaceData;
  checkingDateKey: string | null;
  canCheck: boolean;
  onCheck: (dateKey: string) => void;
}) {
  const router = useRouter();
  const activeQuest = race.quests.find((quest) => quest.phase === "active");
  const countdownTarget = race.isDetailsVisible
    ? activeQuest?.endsAt ?? null
    : race.startsAt;
  const [countdown, setCountdown] = useState(() =>
    countdownTarget ? countdownLabel(countdownTarget) : "",
  );

  useEffect(() => {
    if (!countdownTarget) return;
    const timer = window.setInterval(() => {
      const next = countdownLabel(countdownTarget);
      setCountdown(next);
      if (next === "00:00:00") {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [countdownTarget, router]);

  return (
    <section className="compendium-star-race" id="compendium-star-race">
      <div className="compendium-star-race-heading">
        <div>
          <span>10–16 августа · отдельный недельный зачёт</span>
          <h2>Гонка за звёздами</h2>
        </div>
      </div>
      {!race.isDetailsVisible ? (
        <div className="compendium-star-race-soon">
          <FiClock aria-hidden="true" />
          <div>
            <strong>Гонка скоро начнётся</strong>
            <span>До первого задания</span>
          </div>
          <b>{countdown}</b>
        </div>
      ) : (
        <>
          <div className="compendium-star-race-summary">
            <Link
              className="compendium-star-race-counter"
              href="/compendium/star-race"
              aria-label={`Открыть рейтинг гонки: ${race.totalStars ?? 0} звёзд`}
            >
              <FaStar aria-hidden="true" />
              <span>Звёзды за неделю</span>
              <strong>{race.totalStars ?? 0}</strong>
              <FiArrowRight aria-hidden="true" />
            </Link>
            <div className="compendium-star-race-prizes">
              {race.prizes.map((prize) => (
                <div
                  className="compendium-star-race-prize"
                  key={prize.place}
                >
                  <FiGift aria-hidden="true" />
                  <span className="compendium-star-race-prize-label">
                    {`Награда за топ-${prize.place}`}
                  </span>
                  <span
                    className="compendium-star-race-prize-name"
                    tabIndex={0}
                    aria-label={`${prize.title}. Изображение появится при наведении или фокусе.`}
                  >
                    <strong>{prize.title}</strong>
                    <FiImage aria-hidden="true" />
                    <span
                      className="compendium-star-race-prize-preview"
                      role="tooltip"
                    >
                      <Image
                        src={prize.imageUrl}
                        alt={prize.title}
                        width={480}
                        height={436}
                        unoptimized
                      />
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="compendium-star-race-quests">
            {race.quests.map((quest) => (
              <StarRaceQuestCard
                key={quest.dateKey}
                quest={quest}
                countdown={quest.phase === "active" ? countdown : null}
                isChecking={checkingDateKey === quest.dateKey}
                canCheck={canCheck}
                onCheck={onCheck}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
