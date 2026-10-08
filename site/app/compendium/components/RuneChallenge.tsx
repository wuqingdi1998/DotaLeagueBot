"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { FaStar } from "react-icons/fa";
import {
  FiCheck,
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
import { DailyResetCountdown } from "./DailyResetCountdown";
import { useCompendiumToast } from "../hooks/useCompendiumToast";
import { CompendiumToast } from "./CompendiumToast";

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
  disabled,
  isLoading,
  actionLabel,
  onChange,
  onSubmit,
}: {
  selectedHeroId: string;
  disabled: boolean;
  isLoading: boolean;
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
        {isLoading && <FiLoader className="compendium-spinner" aria-hidden="true" />}
        {actionLabel}
      </button>
    </div>
  );
}

export function RuneChallenge({
  initialChallenge,
  currentTimeMs,
  rewardStars,
  rewardStarsLabel,
  resetCountdown,
  onStarsChange,
  onCompleted,
  isPreview = false,
  showPreviewContent = false,
  overlay,
}: {
  initialChallenge: RuneChallengeData;
  currentTimeMs: number;
  rewardStars: number;
  rewardStarsLabel?: string;
  resetCountdown: string;
  onStarsChange: (totalStars: number, communityStars: number) => void;
  onCompleted?: () => void;
  isPreview?: boolean;
  showPreviewContent?: boolean;
  overlay?: ReactNode;
}) {
  const [challenge, setChallenge] = useState(initialChallenge);
  const [selectedHeroId, setSelectedHeroId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useCompendiumToast();
  const completionHero = useMemo(
    () => challenge.completion?.matchedHeroId
      ? compendiumHeroById(challenge.completion.matchedHeroId)
      : null,
    [challenge.completion],
  );
  const canChangeHero = challenge.selection
    ? challenge.selection.canChangeHero ||
      new Date(challenge.selection.nextChangeAt).getTime() <= currentTimeMs
    : false;

  async function saveHero() {
    if (!selectedHeroId || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetchSiteRequest("/api/compendium/rune-challenge/selection", {
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
      const response = await fetchSiteRequest("/api/compendium/rune-challenge/check", {
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
      if (result.runeChallenge.completion) onCompleted?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить испытание");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className={`compendium-rune-challenge${challenge.hasAccess || isPreview ? "" : " locked"}`}>
      <div className="compendium-rune-heading">
        <h2>Испытание Рун</h2>
        <div
          className="compendium-reward"
          aria-label={rewardStarsLabel
            ? `Награда: ${rewardStarsLabel} звезды`
            : `Награда: ${rewardStars} ${rewardStars === 1 ? "звезда" : "звезды"}`}
        >
          <FaStar aria-hidden="true" />
          {rewardStarsLabel
            ? <strong>{rewardStarsLabel}</strong>
            : <strong>{rewardStars}</strong>}
        </div>
      </div>

      {isPreview && !showPreviewContent ? (
        <div className="compendium-rune-locked-message">
          <FiLock aria-hidden="true" />
          <div>
            <strong>Испытание появится при открытии компендиума</strong>
            <p>Герой выбирается на неделю (7 дней). Победите на нём в рейтинговом или обычном All Pick матче. Выполнение доступно ежедневно и обновляется вместе с другими испытаниями раз в день в 00:00 МСК. В закрытой версии выбор и начисление звёзд недоступны.</p>
          </div>
        </div>
      ) : !challenge.hasAccess ? (
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
          {!challenge.selection ? (
            <div className="compendium-rune-first-selection">
              <p>
                Выбор героя откроет для вас уникальное испытание. Герой выбирается
                на неделю (7 дней). Выполнение доступно ежедневно и обновляется вместе с другими испытаниями раз в день в 00:00 МСК.
              </p>
              <HeroPicker
                selectedHeroId={selectedHeroId}
                disabled={isSaving || isPreview}
                isLoading={isSaving}
                actionLabel={isSaving ? "Сохраняем…" : "Выбрать героя"}
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
                  <small>{cooldownLabel(challenge.selection.nextChangeAt, currentTimeMs)}</small>
                </div>
              </div>
              <div className="compendium-rune-action">
                <p>Герой выбирается на неделю (7 дней). Победите в рейтинговом или обычном All Pick матче на выбранном герое после его выбора. Выполнение доступно ежедневно и обновляется вместе с другими испытаниями раз в день в 00:00 МСК.</p>
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
                    {resetCountdown && <DailyResetCountdown
                      countdown={resetCountdown}
                      label="До нового испытания"
                      className="compendium-rune-reset-countdown"
                    />}
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
                    disabled={isSaving || isPreview}
                    isLoading={isSaving}
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
      <CompendiumToast message={message} />
      {overlay}
    </section>
  );
}
