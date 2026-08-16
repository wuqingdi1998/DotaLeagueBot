"use client";

import { useEffect, useRef } from "react";
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
  FiInfo,
  FiLoader,
} from "react-icons/fi";
import {
  keepGroupedNumbersTogether,
  starRaceQuestProgressLabel,
  type StarRaceData,
  type StarRaceQuest,
} from "../model/star-race";
import { HeroChoice } from "./HeroChoice";
import { StarRaceFinalPrediction } from "./StarRaceFinalPrediction";

function countdownLabel(targetAt: string, currentTimeMs: number): string {
  const remaining = Math.max(0, new Date(targetAt).getTime() - currentTimeMs);
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

const damageNumber = new Intl.NumberFormat("ru-RU");

function StarRaceQuestCard({
  quest,
  countdown,
  verificationCountdown,
  isChecking,
  canCheck,
  onCheck,
  isSubmittingPrediction,
  onSubmitPrediction,
}: {
  quest: StarRaceQuest;
  countdown: string | null;
  verificationCountdown: string | null;
  isChecking: boolean;
  canCheck: boolean;
  onCheck: (dateKey: string) => void;
  isSubmittingPrediction: boolean;
  onSubmitPrediction: (position: number) => void;
}) {
  const isConfigured = Boolean(quest.title && quest.description);
  const progressLabel = starRaceQuestProgressLabel(quest);
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
          <p>{keepGroupedNumbersTogether(quest.description ?? "")}</p>
          {quest.heroes.length > 0 && (
            <div className="compendium-star-race-heroes">
              {quest.heroes.map((hero) => (
                <HeroChoice
                  key={hero.id}
                  hero={hero}
                  isMatched={Boolean(
                    quest.completion?.wins.some((win) => win.hero.id === hero.id),
                  )}
                  isDimmed={Boolean(
                    !quest.completion &&
                    quest.heroProgress?.wins.some(
                      (win) => win.hero.id === hero.id,
                    ),
                  )}
                />
              ))}
            </div>
          )}
          {quest.requirement?.kind === "final-winner-prediction" ? (
            <StarRaceFinalPrediction
              quest={quest}
              isSubmitting={isSubmittingPrediction}
              canSubmit={canCheck}
              onSubmit={onSubmitPrediction}
            />
          ) : quest.completion ? (
            <>
              {quest.progress && progressLabel && (
                <StarRaceProgress
                  current={quest.progress.current}
                  target={quest.progress.target}
                  label={progressLabel}
                />
              )}
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
            </>
          ) : quest.phase === "active" ? (
            <div className="compendium-star-race-action">
              {quest.progress && progressLabel && (
                <StarRaceProgress
                  current={quest.progress.current}
                  target={quest.progress.target}
                  label={progressLabel}
                />
              )}
              <div className="compendium-star-race-countdown">
                <FiClock aria-hidden="true" />
                <span>
                  {quest.pendingVerification
                    ? "До проверки Arcana"
                    : "До конца задания"}
                </span>
                <strong>{verificationCountdown ?? countdown}</strong>
              </div>
              <button
                type="button"
                disabled={
                  !canCheck || isChecking || Boolean(quest.pendingVerification)
                }
                onClick={() => onCheck(quest.dateKey)}
              >
                {isChecking ? (
                  <>
                    <FiLoader className="compendium-spinner" aria-hidden="true" />
                    Проверяем…
                  </>
                ) : quest.pendingVerification ? (
                  "Матч обрабатывается…"
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

function StarRaceProgress({
  current,
  target,
  label,
}: {
  current: number;
  target: number;
  label: string;
}) {
  const percentage = Math.min(100, Math.round((current / target) * 100));
  return (
    <div
      className="compendium-star-race-progress"
      role="status"
      aria-label={`${label}: ${current} из ${target}`}
    >
      <span>{label}</span>
      <strong>
        {damageNumber.format(current)} / {damageNumber.format(target)}
      </strong>
      <span className="compendium-star-race-progress-track" aria-hidden="true">
        <i style={{ width: `${percentage}%` }} />
      </span>
    </div>
  );
}

export function CompendiumStarRace({
  race,
  currentTimeMs,
  checkingDateKey,
  canCheck,
  onCheck,
  isSubmittingPrediction,
  onSubmitPrediction,
}: {
  race: StarRaceData;
  currentTimeMs: number;
  checkingDateKey: string | null;
  canCheck: boolean;
  onCheck: (dateKey: string) => void;
  isSubmittingPrediction: boolean;
  onSubmitPrediction: (position: number) => void;
}) {
  const router = useRouter();
  const automaticCheckKey = useRef<string | null>(null);
  const activeQuest = race.quests.find((quest) => quest.phase === "active");
  const countdownTarget = race.isDetailsVisible
    ? activeQuest?.endsAt ?? null
    : race.startsAt;
  const countdown = countdownTarget
    ? countdownLabel(countdownTarget, currentTimeMs)
    : "";
  const pendingQuest = race.quests.find(
    (quest) => quest.pendingVerification && !quest.completion,
  );
  const verificationCountdown = pendingQuest?.pendingVerification
    ? countdownLabel(
        pendingQuest.pendingVerification.checkAfter,
        currentTimeMs,
      )
    : null;

  useEffect(() => {
    if (countdownTarget && countdown === "00:00:00") router.refresh();
  }, [countdown, countdownTarget, router]);

  useEffect(() => {
    const pendingKey = pendingQuest?.pendingVerification
      ? `${pendingQuest.dateKey}:${pendingQuest.pendingVerification.checkAfter}`
      : null;
    if (
      pendingKey &&
      automaticCheckKey.current !== pendingKey &&
      pendingQuest &&
      verificationCountdown === "00:00:00" &&
      canCheck &&
      checkingDateKey === null
    ) {
      automaticCheckKey.current = pendingKey;
      onCheck(pendingQuest.dateKey);
    }
  }, [
    canCheck,
    checkingDateKey,
    onCheck,
    pendingQuest,
    verificationCountdown,
  ]);

  return (
    <section className="compendium-star-race" id="compendium-star-race">
      <div className="compendium-star-race-heading">
        <div>
          <span>{race.dateLabel} · отдельный недельный зачёт</span>
          <h2>{race.title}</h2>
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
              aria-label={`Открыть рейтинг гонки: ваш результат — ${race.personalStars ?? 0} звёзд, ваше место — ${race.personalRank ?? "пока без места"}`}
            >
              <FaStar aria-hidden="true" />
              <span className="compendium-star-race-total-label">
                Ваш результат
              </span>
              <strong className="compendium-star-race-total-value">
                {race.personalStars ?? 0}
              </strong>
              <span className="compendium-star-race-rank-label">
                Ваше место в гонке
              </span>
              <strong className="compendium-star-race-rank-value">
                {race.personalRank ?? "—"}
              </strong>
              <FiArrowRight aria-hidden="true" />
            </Link>
            <div className="compendium-star-race-rules">
              <FiInfo aria-hidden="true" />
              <div>
                <strong>Условия гонки</strong>
                <ul>
                  <li>В зачёт входят звёзды за {race.dateLabel}.</li>
                  <li>
                    Звёзды за Испытание Рун в гонке не учитываются, но всё так же
                    учитываются в других зачётах.
                  </li>
                </ul>
              </div>
            </div>
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
                verificationCountdown={
                  pendingQuest?.dateKey === quest.dateKey
                    ? verificationCountdown
                    : null
                }
                isChecking={checkingDateKey === quest.dateKey}
                canCheck={canCheck}
                onCheck={onCheck}
                isSubmittingPrediction={isSubmittingPrediction}
                onSubmitPrediction={onSubmitPrediction}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
