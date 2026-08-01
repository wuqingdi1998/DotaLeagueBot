"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaDiscord, FaStar } from "react-icons/fa";
import { FiCalendar, FiClock, FiRefreshCw } from "react-icons/fi";
import { STALE_QUEST_MESSAGE } from "../model/constants";
import type { CompendiumData, QuestCompletion } from "../model/types";
import { QuestCard } from "../components/QuestCard";

function countdownLabel(nextResetAt: string): string {
  const remaining = Math.max(0, new Date(nextResetAt).getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function CompendiumDashboard({
  initialData,
}: {
  initialData: CompendiumData;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [checkingQuestId, setCheckingQuestId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [countdown, setCountdown] = useState(() => countdownLabel(data.nextResetAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = countdownLabel(data.nextResetAt);
      setCountdown(next);
      if (next === "00:00:00") {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [data.nextResetAt, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 7_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function checkQuest(questId: string) {
    if (checkingQuestId) return;
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

  return (
    <div className="compendium-page">
      <section className="compendium-hero-section">
        <div className="compendium-orb compendium-orb-one" />
        <div className="compendium-orb compendium-orb-two" />
        <div className="compendium-title-block">
          <p className="compendium-kicker">The International</p>
          <h1>Компендиум</h1>
          <p>Побеждайте на героях дня и собирайте звёзды сообщества.</p>
        </div>
        <div className="compendium-summary">
          <div><FiCalendar aria-hidden="true" /><span>Сегодня по Москве</span><strong>{data.moscowDateLabel}</strong></div>
          <div><FiClock aria-hidden="true" /><span>До новых заданий</span><strong>{countdown}</strong></div>
          <div className="stars"><FaStar aria-hidden="true" /><span>Ваши звёзды</span><strong>{data.totalStars}</strong></div>
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
            <p><FiRefreshCw aria-hidden="true" /> Три задания · до трёх звёзд</p>
          </div>
          <div className="compendium-quest-grid">
            {data.quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                isChecking={checkingQuestId === quest.id}
                canCheck={checkingQuestId === null}
                onCheck={checkQuest}
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
