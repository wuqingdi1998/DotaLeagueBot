"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import { fetchSiteRequest } from "@/lib/site-request";
import type { CompendiumAdminParticipantSummary } from "./types";
import type { HistoricalChallenge, HistoricalChallenges } from "./challenge-history-types";
import { ManualChallengeForm } from "./ManualChallengeForm";

export function CurrentQuestCards({ participant, onReward, initialDay }: {
  participant: CompendiumAdminParticipantSummary;
  onReward: (rewardStars: number) => void | Promise<void>;
  initialDay?: HistoricalChallenges;
}) {
  const [day, setDay] = useState<HistoricalChallenges | null>(initialDay ?? null);
  const [selectedDate, setSelectedDate] = useState("");
  const [target, setTarget] = useState<HistoricalChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(!initialDay);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const endpoint = `/api/admin/compendium-base/participants/${participant.discordId}`;
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchSiteRequest(`${endpoint}/challenges${selectedDate ? `?date=${selectedDate}` : ""}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить испытания");
        if (!controller.signal.aborted) setDay(result);
      })
      .catch((error) => { if (!controller.signal.aborted) setMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [endpoint, selectedDate, reload]);

  async function complete(details: { matchIds: string[]; heroId?: number; partnerPlayerId?: string }) {
    if (!target || !day) return;
    setIsPending(true);
    setMessage(null);
    try {
      const response = await fetchSiteRequest(`${endpoint}/complete`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: target.kind, questId: target.id, dateKey: day.dateKey, ...details }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось засчитать испытание");
      if (result.wasCreated) await onReward(result.rewardStars);
      setMessage(result.wasCreated ? `Начислено звёзд: ${result.rewardStars}` : "Испытание уже было выполнено ранее");
      setTarget(null);
      setReload((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось засчитать испытание");
    } finally { setIsPending(false); }
  }

  return <section className="compendium-base-current-quests">
    <div className="compendium-base-current-heading">
      <strong>Испытания по датам</strong>
      {day && <label className="compendium-base-date-picker">Дата испытаний (МСК)
        <select value={selectedDate || day.dateKey} disabled={isPending} onChange={(event) => {
          setSelectedDate(event.target.value); setTarget(null); setMessage(null);
        }}>
          {day.dates.map((date) => <option key={date.dateKey} value={date.dateKey}>{date.label}</option>)}
        </select>
      </label>}
    </div>
    {isLoading ? <p role="status">Загружаем испытания…</p> : day && (!selectedDate || day.dateKey === selectedDate) && <>
      {day.challenges.filter((card) => card.kind === "daily").length < 2 &&
        <p className="compendium-base-empty-current">За эту дату не сохранены все задания с героями. Новые случайные задания вместо прошлых не создаются.</p>}
      <div className="compendium-base-current-grid">
        {day.challenges.map((card) => <article key={`${card.kind}:${card.id}`}
          className={`compendium-base-current-card${card.kind === "star_race" ? " compendium-base-race-card" : ""}`}>
          <div className="compendium-base-current-card-heading">
            <strong>{card.title}</strong><span><FaStar aria-hidden="true" /> {card.rewardStars}</span>
          </div>
          {card.heroes.length > 0 && <div className="compendium-base-current-heroes">
            {card.heroes.map((hero) => <Image key={hero.id} src={hero.imageUrl} alt={hero.name} title={hero.name}
              width={64} height={36} unoptimized />)}
          </div>}
          <p className="compendium-base-challenge-description">{card.description}</p>
          {card.isCompleted ? <span className="compendium-base-current-completed">
            {card.isManual ? "Засчитано вручную" : "Уже выполнено"}
          </span> : card.unavailableReason ? <p className="compendium-base-empty-current">{card.unavailableReason}</p>
            : <button type="button" className="compendium-base-manual-complete" disabled={isPending}
              onClick={() => setTarget(card)}>Засчитать вручную</button>}
          {target?.id === card.id && target.kind === card.kind && <ManualChallengeForm key={`${day.dateKey}:${card.kind}:${card.id}`}
            card={card} clanMates={day.clanMates} isPending={isPending} onSave={(details) => void complete(details)}
            onCancel={() => setTarget(null)} />}
        </article>)}
      </div>
    </>}
    {message && <p className="compendium-base-manual-message" role="status">{message}</p>}
    {!isLoading && (!day || (selectedDate && day.dateKey !== selectedDate)) &&
      <button type="button" className="compendium-base-manual-complete" onClick={() => setReload((value) => value + 1)}>Повторить загрузку</button>}
  </section>;
}
