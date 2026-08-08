"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import {
  FiCheck,
  FiClock,
  FiExternalLink,
  FiLoader,
  FiLock,
} from "react-icons/fi";
import {
  customizableSubscriptionRoleNames,
  supporterRoleName,
} from "@/lib/subscription-roles";
import { COMPENDIUM_HEROES, compendiumHeroById } from "../model/heroes";
import type { RuneChallengeData } from "../model/types";

function cooldownLabel(nextChangeAt: string, now: number): string {
  const remaining = Math.max(0, new Date(nextChangeAt).getTime() - now);
  if (remaining === 0) return "Героя уже можно сменить";
  const totalHours = Math.ceil(remaining / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `До смены героя: ${days} дн. ${hours} ч.`;
}

function HeroPicker({
  selectedHeroId,
  unavailableHeroIds,
  disabled,
  actionLabel,
  onChange,
  onSubmit,
}: {
  selectedHeroId: string;
  unavailableHeroIds: number[];
  disabled: boolean;
  actionLabel: string;
  onChange: (heroId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="compendium-rune-picker">
      <label>
        <span>Любимый герой</span>
        <select
          value={selectedHeroId}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Выберите героя</option>
          {[...COMPENDIUM_HEROES]
            .filter((hero) => !unavailableHeroIds.includes(hero.id))
            .sort((left, right) => left.name.localeCompare(right.name, "en"))
            .map((hero) => (
              <option value={hero.id} key={hero.id}>{hero.name}</option>
            ))}
        </select>
      </label>
      <button
        type="button"
        disabled={disabled || !selectedHeroId}
        onClick={onSubmit}
      >
        {disabled && <FiLoader className="compendium-spinner" aria-hidden="true" />}
        {actionLabel}
      </button>
    </div>
  );
}

export function RuneChallenge({
  initialChallenge,
  rewardStars,
  resetCountdown,
  onStarsChange,
}: {
  initialChallenge: RuneChallengeData;
  rewardStars: number;
  resetCountdown: string;
  onStarsChange: (totalStars: number, communityStars: number) => void;
}) {
  const [challenge, setChallenge] = useState(initialChallenge);
  const [selectedHeroId, setSelectedHeroId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const completionHero = useMemo(
    () => challenge.completion
      ? compendiumHeroById(challenge.completion.matchedHeroId)
      : null,
    [challenge.completion],
  );
  const isSelectedHeroUnavailable = Boolean(
    challenge.selection &&
    challenge.unavailableHeroIds.includes(challenge.selection.hero.id),
  );
  const canChangeHero = challenge.selection
    ? isSelectedHeroUnavailable ||
      challenge.selection.canChangeHero ||
      new Date(challenge.selection.nextChangeAt).getTime() <= now
    : false;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function saveHero() {
    if (!selectedHeroId || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/compendium/rune-challenge/selection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ heroId: Number(selectedHeroId) }),
      });
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        runeChallenge?: RuneChallengeData;
      };
      if (!response.ok || !result.runeChallenge) {
        if (result.code === "RUNE_ACCESS_REQUIRED") {
          setChallenge({
            hasAccess: false,
            accessRoleName: null,
            unavailableHeroIds: challenge.unavailableHeroIds,
            selection: null,
            completion: null,
          });
        }
        throw new Error(result.error ?? "Не удалось сохранить любимого героя");
      }
      setChallenge(result.runeChallenge);
      setSelectedHeroId("");
      setMessage("Любимый герой выбран. Следующая смена будет доступна через 7 дней.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить героя");
    } finally {
      setIsSaving(false);
    }
  }

  async function checkWin() {
    if (isChecking) return;
    setIsChecking(true);
    setMessage("");
    try {
      const response = await fetch("/api/compendium/rune-challenge/check", {
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        runeChallenge?: RuneChallengeData;
        totalStars?: number;
        communityStars?: number;
      };
      if (!response.ok || !result.runeChallenge) {
        if (result.code === "RUNE_ACCESS_REQUIRED") {
          setChallenge({
            hasAccess: false,
            accessRoleName: null,
            unavailableHeroIds: challenge.unavailableHeroIds,
            selection: null,
            completion: null,
          });
        }
        throw new Error(result.error ?? "Не удалось проверить испытание");
      }
      setChallenge(result.runeChallenge);
      if (
        typeof result.totalStars === "number" &&
        typeof result.communityStars === "number"
      ) {
        onStarsChange(result.totalStars, result.communityStars);
      }
      setMessage(
        `Испытание выполнено. Вы получили ${rewardStars} ${rewardStars === 1 ? "звезду" : "звезды"}!`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить испытание");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className={`compendium-rune-challenge${challenge.hasAccess ? "" : " locked"}`}>
      <div className="compendium-rune-heading">
        <div>
          <span>Ежедневное задание для подписчиков</span>
          <h2>Испытание Рун</h2>
        </div>
        <div
          className="compendium-reward"
          aria-label={`Награда: ${rewardStars} ${rewardStars === 1 ? "звезда" : "звезды"}`}
        >
          <FaStar aria-hidden="true" /> <strong>{rewardStars}</strong>
        </div>
      </div>

      {!challenge.hasAccess ? (
        <div className="compendium-rune-locked-message">
          <FiLock aria-hidden="true" />
          <div>
            <strong>Задание и выбор героя пока недоступны</strong>
            <p>
              Испытание открывается подписчикам с ролями: {customizableSubscriptionRoleNames.join(", ")}.
              Также доступ есть у роли «{supporterRoleName}». Руна Воды не открывает это испытание.
            </p>
          </div>
        </div>
      ) : (
        <div className="compendium-rune-content">
          {!challenge.selection || isSelectedHeroUnavailable ? (
            <div className="compendium-rune-first-selection">
              <p>
                {isSelectedHeroUnavailable
                  ? "Выбранный герой участвует в сегодняшнем задании гонки. Выберите другого героя для Испытания Рун."
                  : "Выбор героя откроет для вас уникальное испытание. Оно обновляется ежедневно вместе с остальными заданиями, а сменить героя можно будет через 7 дней."}
              </p>
              <HeroPicker
                selectedHeroId={selectedHeroId}
                unavailableHeroIds={challenge.unavailableHeroIds}
                disabled={isSaving}
                actionLabel={isSaving
                  ? "Сохраняем…"
                  : isSelectedHeroUnavailable
                    ? "Сменить героя"
                    : "Выбрать героя"}
                onChange={setSelectedHeroId}
                onSubmit={saveHero}
              />
            </div>
          ) : (
            <>
              <div className="compendium-rune-selected-hero">
                <Image
                  src={challenge.selection.hero.imageUrl}
                  alt={challenge.selection.hero.name}
                  width={164}
                  height={92}
                  unoptimized
                />
                <div>
                  <span>Ваш любимый герой</span>
                  <strong>{challenge.selection.hero.name}</strong>
                  <small>{cooldownLabel(challenge.selection.nextChangeAt, now)}</small>
                </div>
              </div>
              <div className="compendium-rune-action">
                <p>Победите в рейтинговом матче на выбранном герое после его выбора.</p>
                {challenge.completion ? (
                  <div className="compendium-rune-completed-state">
                    <div className="compendium-completion" role="status">
                      <span className="compendium-checkmark"><FiCheck aria-hidden="true" /></span>
                      <div>
                        <strong>Испытание выполнено</strong>
                        {completionHero && <span>Победа на герое {completionHero.name}</span>}
                        <a
                          href={`https://www.opendota.com/matches/${challenge.completion.matchedMatchId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Матч {challenge.completion.matchedMatchId} <FiExternalLink aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                    <div className="compendium-section-countdown compendium-rune-reset-countdown">
                      <FiClock aria-hidden="true" />
                      <span>До нового испытания</span>
                      <strong>{resetCountdown}</strong>
                    </div>
                  </div>
                ) : (
                  <button
                    className="compendium-check-button"
                    type="button"
                    disabled={isChecking}
                    onClick={checkWin}
                  >
                    {isChecking ? (
                      <><FiLoader className="compendium-spinner" aria-hidden="true" /> Проверяем…</>
                    ) : "Проверить"}
                  </button>
                )}
              </div>
              {canChangeHero && (
                <div className="compendium-rune-change-hero">
                  <HeroPicker
                    selectedHeroId={selectedHeroId}
                    unavailableHeroIds={challenge.unavailableHeroIds}
                    disabled={isSaving}
                    actionLabel={isSaving ? "Сохраняем…" : "Сменить героя"}
                    onChange={setSelectedHeroId}
                    onSubmit={saveHero}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
      {message && <p className="compendium-rune-message" role="status">{message}</p>}
    </section>
  );
}
