"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa";
import { FiClock, FiDatabase, FiRefreshCw } from "react-icons/fi";
import { STALE_QUEST_MESSAGE } from "../model/constants";
import { tournamentCountdownLabel } from "../model/time";
import type { CompendiumData, QuestCompletion } from "../model/types";
import {
  CompendiumHeroImagePreloader,
} from "../components/CompendiumHeroImagePreloader";
import { DailyRerollNotice } from "../components/DailyRerollNotice";
import { QuestCard } from "../components/QuestCard";

function countdownLabel(nextResetAt: string): string {
  const remaining = Math.max(0, new Date(nextResetAt).getTime() - Date.now());
  const totalSeconds = Math.ceil(remaining / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

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
  const [toast, setToast] = useState("");
  const [countdown, setCountdown] = useState(() => countdownLabel(data.nextResetAt));
  const [tournamentCountdown, setTournamentCountdown] = useState(() =>
    tournamentCountdownLabel(data.tournamentStartsAt),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = countdownLabel(data.nextResetAt);
      setCountdown(next);
      setTournamentCountdown(
        tournamentCountdownLabel(data.tournamentStartsAt),
      );
      if (next === "00:00:00") {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [data.nextResetAt, data.tournamentStartsAt, router]);

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
        quests: current.quests.map((quest) =>
          quest.id === questId
            ? { ...quest, completion: result.completion ?? null }
            : quest,
        ),
      }));
      setToast("Задание выполнено. Вы получили 1 звезду!");
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
      setToast("Задание заменено. Рероллов на сегодня не осталось.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось заменить задание");
    } finally {
      setRerollingQuestId(null);
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

      {!data.hasDotaId ? (
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
      ) : (
        <section className="compendium-daily-section">
          <div className="compendium-section-heading">
            <div><span>Обновление ежедневно в 00:00 МСК</span><h2>Задания дня</h2></div>
            <div className="compendium-section-status">
              <div className="compendium-section-countdown">
                <FiClock aria-hidden="true" />
                <span>До новых заданий</span>
                <strong>{countdown}</strong>
              </div>
              <p><FiRefreshCw aria-hidden="true" /> Три задания · до трёх звёзд</p>
            </div>
          </div>
          <DailyRerollNotice remaining={data.rerollsRemaining} />
          <div className="compendium-quest-grid">
            {data.quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
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
          <p className="compendium-note">
            Учитываются только рейтинговые победы, завершённые сегодня по Москве.
            Матч может появиться в OpenDota с небольшой задержкой.
          </p>
        </section>
      )}

      {toast && <div className="compendium-toast" role="status">{toast}</div>}
      <Link className="compendium-back-link" href="/tournaments">К турнирам сообщества</Link>
    </div>
  );
}
