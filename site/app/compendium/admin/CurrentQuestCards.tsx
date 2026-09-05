"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import Image from "next/image";
import { useState } from "react";
import { FaStar } from "react-icons/fa";
import { FiCheck, FiLoader } from "react-icons/fi";
import type {
  CompendiumAdminCurrentQuest,
  CompendiumAdminCurrentStarRaceQuest,
  CompendiumAdminParticipantSummary,
} from "./types";

type CompletionTarget =
  | { kind: "daily"; questId: string }
  | { kind: "star_race"; dateKey: string };

function ManualCompletionButton({
  isCompleted,
  isManual,
  isLoading,
  onClick,
}: {
  isCompleted: boolean;
  isManual: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  if (isCompleted) {
    return (
      <span className="compendium-base-current-completed">
        <FiCheck aria-hidden="true" />
        {isManual ? "Засчитано вручную" : "Уже выполнено"}
      </span>
    );
  }
  return (
    <button
      className="compendium-base-manual-complete"
      type="button"
      disabled={isLoading}
      onClick={onClick}
    >
      {isLoading ? (
        <><FiLoader className="compendium-spinner" aria-hidden="true" /> Засчитываем…</>
      ) : (
        "Засчитать вручную"
      )}
    </button>
  );
}

function DailyQuestCard({
  quest,
  isLoading,
  onComplete,
}: {
  quest: CompendiumAdminCurrentQuest;
  isLoading: boolean;
  onComplete: () => void;
}) {
  return (
    <article className="compendium-base-current-card">
      <div className="compendium-base-current-card-heading">
        <strong>Испытание {quest.position}</strong>
        <span><FaStar aria-hidden="true" /> {quest.rewardStars}</span>
      </div>
      <div className="compendium-base-current-heroes">
        {quest.heroes.map((hero) => (
          <Image
            key={hero.id}
            src={hero.imageUrl}
            alt={hero.name}
            title={hero.name}
            width={64}
            height={36}
            unoptimized
          />
        ))}
      </div>
      <ManualCompletionButton
        isCompleted={quest.isCompleted}
        isManual={quest.isManual}
        isLoading={isLoading}
        onClick={onComplete}
      />
    </article>
  );
}

function StarRaceQuestCard({
  quest,
  isLoading,
  onComplete,
}: {
  quest: CompendiumAdminCurrentStarRaceQuest;
  isLoading: boolean;
  onComplete: () => void;
}) {
  return (
    <article className="compendium-base-current-card compendium-base-race-card">
      <div className="compendium-base-current-card-heading">
        <strong>Испытание гонки · {quest.title}</strong>
        <span><FaStar aria-hidden="true" /> {quest.rewardStars}</span>
      </div>
      <p>{quest.description}</p>
      {quest.heroes.length > 0 && (
        <div className="compendium-base-current-heroes">
          {quest.heroes.map((hero) => (
            <Image
              key={hero.id}
              src={hero.imageUrl}
              alt={hero.name}
              title={hero.name}
              width={64}
              height={36}
              unoptimized
            />
          ))}
        </div>
      )}
      <ManualCompletionButton
        isCompleted={quest.isCompleted}
        isManual={quest.isManual}
        isLoading={isLoading}
        onClick={onComplete}
      />
    </article>
  );
}

export function CurrentQuestCards({
  participant,
  onReward,
}: {
  participant: CompendiumAdminParticipantSummary;
  onReward: (rewardStars: number) => void | Promise<void>;
}) {
  const [dailyQuests, setDailyQuests] = useState(participant.currentQuests);
  const [raceQuests, setRaceQuests] = useState(
    participant.currentStarRaceQuests,
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function complete(target: CompletionTarget) {
    const key = target.kind === "daily" ? target.questId : target.dateKey;
    setPendingKey(key);
    setMessage(null);
    try {
      const response = await fetchSiteRequest(
        `/api/admin/compendium-base/participants/${participant.discordId}/complete`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(target),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        rewardStars?: number;
        wasCreated?: boolean;
      };
      if (!response.ok || typeof result.rewardStars !== "number") {
        throw new Error(result.error ?? "Не удалось засчитать испытание");
      }
      if (target.kind === "daily") {
        setDailyQuests((quests) => quests.map((quest) =>
          quest.id === target.questId
            ? { ...quest, isCompleted: true, isManual: true }
            : quest
        ));
      } else {
        setRaceQuests((quests) => quests.map((quest) =>
          quest.dateKey === target.dateKey
            ? { ...quest, isCompleted: true, isManual: true }
            : quest
        ));
      }
      if (result.wasCreated) await onReward(result.rewardStars);
      setMessage(
        result.wasCreated
          ? `Начислено звёзд: ${result.rewardStars}`
          : "Испытание уже было выполнено ранее",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Не удалось засчитать испытание",
      );
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="compendium-base-current-quests">
      <div className="compendium-base-current-heading">
        <strong>Текущие испытания</strong>
        <span>Обычные карточки и активное задание гонки</span>
      </div>
      {dailyQuests.length || raceQuests.length ? (
        <div className="compendium-base-current-grid">
          {dailyQuests.map((quest) => (
            <DailyQuestCard
              quest={quest}
              isLoading={pendingKey === quest.id}
              onComplete={() => void complete({ kind: "daily", questId: quest.id })}
              key={quest.id}
            />
          ))}
          {raceQuests.map((quest) => (
            <StarRaceQuestCard
              quest={quest}
              isLoading={pendingKey === quest.dateKey}
              onComplete={() => void complete({
                kind: "star_race",
                dateKey: quest.dateKey,
              })}
              key={quest.dateKey}
            />
          ))}
        </div>
      ) : (
        <p className="compendium-base-empty-current">
          Активных испытаний сейчас нет.
        </p>
      )}
      {message && <p className="compendium-base-manual-message" role="status">{message}</p>}
    </section>
  );
}
