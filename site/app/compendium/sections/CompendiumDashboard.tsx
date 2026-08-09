"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa";
import { FiArrowRight, FiClock, FiDatabase } from "react-icons/fi";
import { useServerClock } from "../hooks/useServerClock";
import { STALE_QUEST_MESSAGE } from "../model/constants";
import { tournamentCountdownLabel } from "../model/time";
import type { CompendiumData, QuestCompletion } from "../model/types";
import {
  CompendiumHeroImagePreloader,
} from "../components/CompendiumHeroImagePreloader";
import { DailyRerollNotice } from "../components/DailyRerollNotice";
import { QuestCard } from "../components/QuestCard";
import { CompendiumRewards } from "../components/CompendiumRewards";
import { CompendiumPredictions } from "../components/CompendiumPredictions";
import { RuneChallenge } from "../components/RuneChallenge";
import { CompendiumStarRace } from "../components/CompendiumStarRace";
import type { PredictionScore } from "../model/predictions";

function countdownLabel(nextResetAt: string, currentTimeMs: number): string {
  const remaining = Math.max(0, new Date(nextResetAt).getTime() - currentTimeMs);
  const totalSeconds = Math.ceil(remaining / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

const progressNumber = new Intl.NumberFormat("ru-RU");

export function CompendiumDashboard({
  initialData,
  isOrganizer,
}: {
  initialData: CompendiumData;
  isOrganizer: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [checkingQuestId, setCheckingQuestId] = useState<string | null>(null);
  const [rerollingQuestId, setRerollingQuestId] = useState<string | null>(null);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);
  const [checkingStarRaceDate, setCheckingStarRaceDate] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const currentTimeMs = useServerClock(data.serverNow);
  const countdown = countdownLabel(data.nextResetAt, currentTimeMs);
  const tournamentCountdown = tournamentCountdownLabel(
    data.tournamentStartsAt,
    new Date(currentTimeMs),
  );

  useEffect(() => {
    if (countdown === "00:00:00") router.refresh();
  }, [countdown, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 7_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function checkQuest(questId: string) {
    if (checkingQuestId || rerollingQuestId) return;
    setCheckingQuestId(questId);
    try {
      const response = await fetch(
        `/api/compendium/daily-quests/${questId}/check`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        completion?: QuestCompletion;
        totalStars?: number;
        communityStars?: number;
        rerollsRemaining?: number;
        quests?: CompendiumData["quests"];
      };
      if (!response.ok || !result.completion) {
        if (result.code === "STALE_QUEST") {
          setToast(STALE_QUEST_MESSAGE);
          router.refresh();
          return;
        }
        throw new Error(result.error ?? "Не удалось проверить задание");
      }
      setData((current) => ({
        ...current,
        totalStars: result.totalStars ?? current.totalStars,
        communityStars: result.communityStars ?? current.communityStars,
        rerollsRemaining: result.rerollsRemaining ?? current.rerollsRemaining,
        quests: result.quests ?? current.quests.map((quest) =>
          quest.id === questId
            ? { ...quest, completion: result.completion ?? null }
            : quest,
        ),
      }));
      setToast(
        `Задание выполнено. Вы получили ${data.dailyChallengeRewardStars} ${data.dailyChallengeRewardStars === 1 ? "звезду" : "звезды"}!`,
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось проверить задание");
    } finally {
      setCheckingQuestId(null);
    }
  }

  async function rerollQuest(questId: string) {
    if (checkingQuestId || rerollingQuestId || data.rerollsRemaining < 1) return;
    setRerollingQuestId(questId);
    try {
      const response = await fetch(
        `/api/compendium/daily-quests/${questId}/reroll`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        quest?: CompendiumData["quests"][number];
        rerollsRemaining?: number;
      };
      if (!response.ok || !result.quest) {
        if (result.code === "STALE_QUEST") {
          setToast(STALE_QUEST_MESSAGE);
          router.refresh();
          return;
        }
        throw new Error(result.error ?? "Не удалось заменить задание");
      }
      setData((current) => ({
        ...current,
        rerollsRemaining: result.rerollsRemaining ?? 0,
        quests: current.quests.map((quest) =>
          quest.id === questId ? result.quest ?? quest : quest,
        ),
      }));
      const remaining = result.rerollsRemaining ?? 0;
      setToast(
        remaining > 0
          ? `Задание заменено. Осталось рероллов: ${remaining}.`
          : "Задание заменено. Рероллов на сегодня не осталось.",
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось заменить задание");
    } finally {
      setRerollingQuestId(null);
    }
  }

  async function selectPrediction(matchId: string, score: PredictionScore) {
    if (submittingMatchId) return;
    setSubmittingMatchId(matchId);
    try {
      const response = await fetch(`/api/compendium/predictions/${matchId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score }),
      });
      const result = (await response.json()) as {
        error?: string;
        prediction?: CompendiumData["predictions"][number];
      };
      if (!response.ok || !result.prediction) {
        throw new Error(result.error ?? "Не удалось сохранить прогноз");
      }
      setData((current) => ({
        ...current,
        predictions: current.predictions.map((match) =>
          match.id === matchId ? result.prediction ?? match : match,
        ),
      }));
      setToast(`Прогноз ${score} сохранён`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось сохранить прогноз");
    } finally {
      setSubmittingMatchId(null);
    }
  }

  async function checkStarRaceQuest(dateKey: string) {
    if (checkingStarRaceDate || checkingQuestId || rerollingQuestId) return;
    setCheckingStarRaceDate(dateKey);
    try {
      const response = await fetch(
        `/api/compendium/star-race/quests/${dateKey}/check`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        completion?: unknown | null;
        progress?: { current: number; target: number } | null;
        heroProgress?: { wins: unknown[]; target: number } | null;
        rewardStars?: number;
        starRace?: CompendiumData["starRace"];
        totalStars?: number;
        communityStars?: number;
      };
      if (!response.ok || !result.starRace) {
        if (result.code === "STAR_RACE_NOT_ACTIVE") router.refresh();
        throw new Error(result.error ?? "Не удалось проверить задание гонки");
      }
      setData((current) => ({
        ...current,
        starRace: result.starRace ?? current.starRace,
        totalStars: result.totalStars ?? current.totalStars,
        communityStars: result.communityStars ?? current.communityStars,
      }));
      setToast(
        result.completion
          ? `Задание выполнено. Вы получили ${result.rewardStars ?? 2} звезды!`
          : result.heroProgress
            ? `Засчитано героев: ${result.heroProgress.wins.length} из ${result.heroProgress.target}`
          : `Учтено ${progressNumber.format(
              result.progress?.current ?? 0,
            )} из ${progressNumber.format(
              result.progress?.target ?? 30_000,
            )} урона по строениям`,
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Не удалось проверить задание гонки",
      );
    } finally {
      setCheckingStarRaceDate(null);
    }
  }

  return (
    <div className="compendium-page">
      <CompendiumHeroImagePreloader />
      <section className="compendium-hero-section">
        <div className="compendium-orb compendium-orb-one" />
        <div className="compendium-orb compendium-orb-two" />
        {isOrganizer && (
          <Link
            className="compendium-base-link compendium-base-floating-link"
            href="/compendium/base"
          >
            <FiDatabase aria-hidden="true" /> База
          </Link>
        )}
        <div className="compendium-title-block">
          <p className="compendium-kicker">The International 2026</p>
          <h1>Компендиум</h1>
          <a
            className="compendium-liquipedia-link"
            href="https://liquipedia.net/dota2/The_International/2026"
            target="_blank"
            rel="noreferrer"
          >
            <span>Страница турнира на Liquipedia</span>
            <Image
              src="/liquipedia-icon.svg"
              alt=""
              width={38}
              height={28}
              unoptimized
            />
          </a>
        </div>
        <div className="compendium-summary">
          <div className="compendium-tournament-countdown">
            <FiClock aria-hidden="true" />
            <span>ДО ТУРНИРА</span>
            <strong>{tournamentCountdown}</strong>
          </div>
        </div>
      </section>

      {!data.hasDotaId && (
        <section className="compendium-link-profile">
          <FaDiscord aria-hidden="true" />
          <div>
            <h2>Сначала привяжите Dota ID</h2>
            <p>Откройте профиль в Discord-боте и завершите регистрацию участника.</p>
          </div>
          <a href="https://discord.gg/lsesports" target="_blank" rel="noreferrer">
            Перейти в Discord
          </a>
        </section>
      )}
      <section className="compendium-rewards-section" id="compendium-rewards">
        {data.hasDotaId && (
          <CompendiumRewards
            personalStars={data.totalStars}
            communityStars={data.communityStars}
          />
        )}
        <CompendiumStarRace
          race={data.starRace}
          currentTimeMs={currentTimeMs}
          checkingDateKey={checkingStarRaceDate}
          canCheck={
            data.hasDotaId &&
            checkingStarRaceDate === null &&
            checkingQuestId === null &&
            rerollingQuestId === null
          }
          onCheck={checkStarRaceQuest}
        />
      </section>
      {data.hasDotaId && (
        <>
          <section className="compendium-daily-section" id="compendium-quests">
          <div className="compendium-section-heading">
            <div><span>Обновление ежедневно в 00:00 МСК</span><h2>Задания дня</h2></div>
            <div className="compendium-section-status">
              {data.dailyChallengeRewardStars === 2 && (
                <div className="compendium-weekend-bonus" role="status">
                  <span>Бонус выходного дня</span>
                  <strong>Х2</strong>
                </div>
              )}
              <div className="compendium-section-countdown">
                <FiClock aria-hidden="true" />
                <span>До новых заданий</span>
                <strong>{countdown}</strong>
              </div>
            </div>
          </div>
          <DailyRerollNotice
            remaining={data.rerollsRemaining}
            totalStars={data.totalStars}
          />
          <p className="compendium-mobile-swipe-hint">
            Листайте задания влево и вправо
            <FiArrowRight aria-hidden="true" />
          </p>
          <div className={`compendium-quest-grid quest-count-${data.quests.length}`}>
            {data.quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                rewardStars={data.dailyChallengeRewardStars}
                isChecking={checkingQuestId === quest.id}
                isRerolling={rerollingQuestId === quest.id}
                canCheck={checkingQuestId === null && rerollingQuestId === null}
                hasReroll={data.rerollsRemaining > 0}
                canReroll={
                  data.rerollsRemaining > 0 &&
                  checkingQuestId === null &&
                  rerollingQuestId === null
                }
                onCheck={checkQuest}
                onReroll={rerollQuest}
              />
            ))}
          </div>
          <RuneChallenge
            initialChallenge={data.runeChallenge}
            currentTimeMs={currentTimeMs}
            rewardStars={data.dailyChallengeRewardStars}
            resetCountdown={countdown}
            onStarsChange={(totalStars, communityStars) => setData((current) => ({
              ...current,
              totalStars,
              communityStars,
            }))}
          />
          </section>
          <CompendiumPredictions
            matches={data.predictions}
            isOrganizer={isOrganizer}
            submittingMatchId={submittingMatchId}
            onSelect={selectPrediction}
          />
        </>
      )}

      {toast && <div className="compendium-toast" role="status">{toast}</div>}
    </div>
  );
}
