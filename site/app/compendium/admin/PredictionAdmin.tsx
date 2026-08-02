"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiArrowLeft, FiCalendar, FiCheck, FiClock } from "react-icons/fi";
import { predictionScores, type PredictionScore } from "../model/predictions";
import type { PredictionAdminMatch } from "../services/prediction-repository";

type MatchDraft = { teamAKey: string; teamBKey: string; time: string };

const blankMatches: MatchDraft[] = [
  { teamAKey: "", teamBKey: "", time: "12:00" },
  { teamAKey: "", teamBKey: "", time: "15:00" },
  { teamAKey: "", teamBKey: "", time: "18:00" },
];

function timeValue(startsAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(startsAt));
}

export function PredictionAdmin({
  initialMatches,
  teams,
  minimumDate,
  nowIso,
}: {
  initialMatches: PredictionAdminMatch[];
  teams: Array<{ key: string; name: string }>;
  minimumDate: string;
  nowIso: string;
}) {
  const [dateKey, setDateKey] = useState(minimumDate);
  const [drafts, setDrafts] = useState<MatchDraft[]>(() => {
    const existing = initialMatches.filter((match) => match.moscowDate === minimumDate);
    return existing.length === 3 ? existing.map((match) => ({
      teamAKey: match.teamA.key,
      teamBKey: match.teamB.key,
      time: timeValue(match.startsAt),
    })) : blankMatches.map((match) => ({ ...match }));
  });
  const [matches, setMatches] = useState(initialMatches);
  const [results, setResults] = useState<Record<string, PredictionScore>>(Object.fromEntries(
    initialMatches.map((match) => [match.id, match.actualScore ?? "2:0"]),
  ));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const resultMatches = useMemo(
    () => matches.filter((match) => new Date(match.startsAt) <= new Date(nowIso)),
    [matches, nowIso],
  );

  function loadDate(nextDate: string) {
    setDateKey(nextDate);
    const existing = matches.filter((match) => match.moscowDate === nextDate);
    setDrafts(existing.length === 3 ? existing.map((match) => ({
      teamAKey: match.teamA.key,
      teamBKey: match.teamB.key,
      time: timeValue(match.startsAt),
    })) : blankMatches.map((match) => ({ ...match })));
  }

  function updateDraft(index: number, update: Partial<MatchDraft>) {
    setDrafts((current) => current.map((draft, draftIndex) =>
      draftIndex === index ? { ...draft, ...update } : draft,
    ));
  }

  async function saveMatches() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/compendium-predictions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dateKey,
          matches: drafts.map((draft) => ({
            teamAKey: draft.teamAKey,
            teamBKey: draft.teamBKey,
            startsAt: `${dateKey}T${draft.time}:00+03:00`,
          })),
        }),
      });
      const result = (await response.json()) as { error?: string; matches?: PredictionAdminMatch[] };
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить матчи");
      if (result.matches) setMatches(result.matches);
      setMessage("Три матча сохранены. Они появятся у участников в выбранный день.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить матчи");
    } finally {
      setSaving(false);
    }
  }

  async function saveResult(matchId: string) {
    setSaving(true);
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
      setMatches((current) => current.map((match) =>
        match.id === matchId ? { ...match, actualScore: score } : match,
      ));
      setMessage(`Результат сохранён. Проверено прогнозов: ${result.rewardedPlayers ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось записать результат");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="prediction-admin-page">
      <Link href="/compendium" className="prediction-admin-back"><FiArrowLeft /> Вернуться в Компендиум</Link>
      <header>
        <span>Только для организатора</span>
        <h1>Матчи и прогнозы</h1>
        <p>Назначьте ровно три матча до 23:59 предыдущего дня. Прогноз участника закроется в момент начала матча.</p>
      </header>

      <section className="prediction-admin-panel">
        <div className="prediction-admin-panel-heading">
          <div><span>Шаг 1</span><h2>Матчи следующего дня</h2></div>
          <label><FiCalendar /><span>Дата по Москве</span><input type="date" min={minimumDate} value={dateKey} onChange={(event) => loadDate(event.target.value)} /></label>
        </div>
        <div className="prediction-admin-drafts">
          {drafts.map((draft, index) => (
            <article key={index}>
              <strong>Матч {index + 1}</strong>
              <label>Первая команда<select value={draft.teamAKey} onChange={(event) => updateDraft(index, { teamAKey: event.target.value })}><option value="">Выберите команду</option>{teams.map((team) => <option value={team.key} key={team.key}>{team.name}</option>)}</select></label>
              <span>против</span>
              <label>Вторая команда<select value={draft.teamBKey} onChange={(event) => updateDraft(index, { teamBKey: event.target.value })}><option value="">Выберите команду</option>{teams.map((team) => <option value={team.key} key={team.key}>{team.name}</option>)}</select></label>
              <label><FiClock /> Время МСК<input type="time" value={draft.time} onChange={(event) => updateDraft(index, { time: event.target.value })} /></label>
            </article>
          ))}
        </div>
        <button type="button" className="prediction-admin-save" disabled={saving} onClick={saveMatches}><FiCheck /> {saving ? "Сохраняем…" : "Сохранить три матча"}</button>
      </section>

      <section className="prediction-admin-panel">
        <div className="prediction-admin-panel-heading"><div><span>Шаг 2</span><h2>Результаты завершённых матчей</h2></div></div>
        {resultMatches.length ? (
          <div className="prediction-admin-results">
            {resultMatches.map((match) => (
              <article key={match.id}>
                <div><span>{match.moscowDate}</span><strong>{match.teamA.name} — {match.teamB.name}</strong></div>
                {match.actualScore ? <b>Итог: {match.actualScore}</b> : <><select value={results[match.id]} onChange={(event) => setResults((current) => ({ ...current, [match.id]: event.target.value as PredictionScore }))}>{predictionScores.map((score) => <option key={score}>{score}</option>)}</select><button type="button" disabled={saving} onClick={() => saveResult(match.id)}>Записать итог</button></>}
              </article>
            ))}
          </div>
        ) : <p className="prediction-admin-empty">Завершённых матчей пока нет.</p>}
      </section>
      {message && <div className="prediction-admin-message" role="status">{message}</div>}
    </main>
  );
}
