"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import type { PredictionScore } from "../model/predictions";
import type { PredictionAdminMatch } from "../services/prediction-repository";
import { PredictionDayEditor } from "./PredictionDayEditor";
import {
  predictionDraftsForDate,
  predictionMatchCountForDate,
  type PredictionMatchDraft,
} from "./prediction-admin-model";
import { PredictionScheduleList } from "./PredictionScheduleList";

export function PredictionAdmin({
  initialMatches,
  teams,
  initialDate,
}: {
  initialMatches: PredictionAdminMatch[];
  teams: Array<{ key: string; name: string }>;
  initialDate: string;
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [dateKey, setDateKey] = useState(initialDate);
  const [drafts, setDrafts] = useState(() => predictionDraftsForDate(initialMatches, initialDate));
  const [matchCount, setMatchCount] = useState<2 | 3>(() => predictionMatchCountForDate(initialMatches, initialDate));
  const [results, setResults] = useState<Record<string, PredictionScore>>(() => Object.fromEntries(
    initialMatches.map((match) => [match.id, match.actualScore ?? "2:0"]),
  ));
  const [activeResultMatchId, setActiveResultMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function loadDate(nextDate: string, shouldScroll = false) {
    setDateKey(nextDate);
    setDrafts(predictionDraftsForDate(matches, nextDate));
    setMatchCount(predictionMatchCountForDate(matches, nextDate));
    if (shouldScroll) {
      window.requestAnimationFrame(() => {
        document.getElementById("prediction-day-editor")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  function updateDraft(index: number, update: Partial<PredictionMatchDraft>) {
    setDrafts((current) => current.map((draft, draftIndex) =>
      draftIndex === index ? { ...draft, ...update } : draft,
    ));
  }

  async function saveMatches() {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/compendium-predictions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dateKey,
          matches: drafts.slice(0, matchCount).map((draft) => ({
            teamAKey: draft.teamAKey,
            teamBKey: draft.teamBKey,
            startsAt: `${dateKey}T${draft.time}:00+03:00`,
          })),
        }),
      });
      const result = (await response.json()) as { error?: string; matches?: PredictionAdminMatch[] };
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить матчи");
      if (result.matches) {
        const refreshedMatches = result.matches;
        setMatches(refreshedMatches);
        setDrafts(predictionDraftsForDate(refreshedMatches, dateKey));
        setResults((current) => ({
          ...Object.fromEntries(refreshedMatches.map((match) => [match.id, current[match.id] ?? match.actualScore ?? "2:0"])),
        }));
      }
      setMessage(`${matchCount} матча сохранены на ${dateKey}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить матчи");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveResult(matchId: string) {
    setIsSaving(true);
    setMessage("");
    try {
      const score = results[matchId];
      const response = await fetch("/api/admin/compendium-predictions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, score }),
      });
      const result = (await response.json()) as { error?: string; rewardedPlayers?: number };
      if (!response.ok) throw new Error(result.error ?? "Не удалось записать результат");
      const completedMatch = matches.find((match) => match.id === matchId);
      setMatches((current) => current.map((match) =>
        match.id === matchId ? { ...match, actualScore: score } : match,
      ));
      if (completedMatch?.moscowDate === dateKey) {
        setDrafts((current) => current.map((draft, index) =>
          index + 1 === completedMatch.position ? { ...draft, isLocked: true } : draft,
        ));
      }
      setActiveResultMatchId(null);
      setMessage(`Результат сохранён. Проверено прогнозов: ${result.rewardedPlayers ?? 0}. Звёзды выданы автоматически.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось записать результат");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSchedule(input: { matchId?: string; dateKey?: string }, confirmation: string) {
    if (!window.confirm(confirmation)) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/compendium-predictions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as {
        error?: string;
        deletedMatches?: number;
        matches?: PredictionAdminMatch[];
      };
      if (!response.ok) throw new Error(result.error ?? "Не удалось удалить расписание");
      const refreshedMatches = result.matches ?? [];
      setMatches(refreshedMatches);
      setDrafts(predictionDraftsForDate(refreshedMatches, dateKey));
      setMatchCount(predictionMatchCountForDate(refreshedMatches, dateKey));
      setActiveResultMatchId(null);
      setMessage(`Удалено матчей: ${result.deletedMatches ?? 0}. Можно заполнить расписание заново.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить расписание");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="prediction-admin-page">
      <Link href="/compendium" className="prediction-admin-back"><FiArrowLeft aria-hidden="true" /> Вернуться в Компендиум</Link>
      <header>
        <span>Только для организатора</span>
        <h1>Матчи и прогнозы</h1>
        <p>Создавайте расписание на любой день, редактируйте команды и время, а после матча сохраняйте итоговый счёт и автоматически раздавайте звёзды.</p>
      </header>
      <PredictionDayEditor
        dateKey={dateKey}
        drafts={drafts}
        matchCount={matchCount}
        teams={teams}
        isSaving={isSaving}
        onDateChange={loadDate}
        onMatchCountChange={setMatchCount}
        onDraftChange={updateDraft}
        onSave={saveMatches}
      />
      <PredictionScheduleList
        matches={matches}
        results={results}
        activeResultMatchId={activeResultMatchId}
        isSaving={isSaving}
        onEdit={(match) => loadDate(match.moscowDate, true)}
        onOpenResult={setActiveResultMatchId}
        onResultChange={(matchId, score) => setResults((current) => ({ ...current, [matchId]: score }))}
        onSaveResult={saveResult}
        onDeleteMatch={(match) => void deleteSchedule(
          { matchId: match.id },
          `Удалить матч ${match.teamA.name} — ${match.teamB.name}? Прогнозы и выданные за него звёзды тоже будут удалены.`,
        )}
        onDeleteDay={(day) => void deleteSchedule(
          { dateKey: day },
          `Удалить все матчи за ${day}? Прогнозы и выданные за них звёзды тоже будут удалены.`,
        )}
      />
      {message && <div className="prediction-admin-message" role="status">{message}</div>}
    </main>
  );
}
