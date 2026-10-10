"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSiteRequest } from "@/lib/site-request";
import { VERIFICATION_RETRY_MINUTES, type VerificationRequest } from "../model/verification-retries";

const endpoint = "/api/admin/compendium-base/verification-requests";
function moscowTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function VerificationQueue({ initialRequests }: { initialRequests?: VerificationRequest[] }) {
  const [requests, setRequests] = useState(initialRequests ?? []);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const visibleRequests = requests.filter((request) => request.status === "pending" || request.status === "exhausted");
  const router = useRouter();
  const load = useCallback(async () => {
    try {
      const response = await fetchSiteRequest(endpoint, { method: "GET", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить очередь");
      setRequests(result.requests);
      setError(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось загрузить очередь"); }
  }, []);
  useEffect(() => {
    if (!initialRequests) void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load, initialRequests]);
  async function check(id: string) {
    setChecking(id);
    try {
      const response = await fetchSiteRequest(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось проверить");
      setRequests(result.requests);
      setError(result.checked ? null : "Запрос уже проверяется или результат засчитан. Обновите очередь.");
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось проверить"); }
    finally { setChecking(null); }
  }
  async function cancel(id: string) {
    setRemoving(id);
    try {
      const response = await fetchSiteRequest(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось удалить запрос");
      setRequests(result.requests);
      setError(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось удалить запрос"); }
    finally { setRemoving(null); }
  }
  return <section className="compendium-verification-queue">
    <div className="compendium-base-list-heading"><div><span>OpenDota</span><h2>Запросы на проверку результатов</h2></div>
      <button type="button" onClick={() => void load()}>Обновить</button></div>
    <p>Автоматически через {VERIFICATION_RETRY_MINUTES.join(", ")} минут. Время и дата задания – по МСК.</p>
    <p>«Проверить вручную» запрашивает результат у OpenDota. Для самостоятельного зачёта откройте игрока ниже и выберите исходную дату задания.</p>
    <p>Крестик убирает запрос из очереди и останавливает его автоматические проверки.</p>
    {error && <p role="alert">{error}</p>}
    {!visibleRequests.length && <p>Ожидающих запросов нет.</p>}
    <div className="compendium-verification-requests">{visibleRequests.map((request) => <article key={request.id}>
      <div className="compendium-verification-request-heading"><strong>{request.playerName} · {request.snapshot.title}</strong>
        <button type="button" className="compendium-verification-remove" disabled={checking !== null || removing !== null}
          aria-label={`Удалить запрос: ${request.playerName} · ${request.snapshot.title}`}
          title="Удалить запрос и остановить автопроверку" onClick={() => void cancel(request.id)}>{removing === request.id ? "…" : "×"}</button></div>
      <span>Задание за {request.snapshot.dateKey} · ожидание с {moscowTime(request.startedAt)}</span>
      <span>{request.isChecking ? "Проверка выполняется" : request.status === "exhausted"
        ? "Два часа истекли – нужна проверка организатора" : "Ожидает автоматической проверки"}</span>
      <span>Автоматических попыток: {request.attempts} · проверок организатора: {request.manualAttempts}</span>
      {request.nextAttemptAt && <span>Следующая попытка: {moscowTime(request.nextAttemptAt)} МСК</span>}
      {request.lastError && <span>Последний результат: {request.lastError}</span>}
      {request.status === "exhausted" && <span>{request.notifiedAt ? "Уведомление организатору отправлено" : "Уведомление организатору ожидает отправки"}</span>}
      <button type="button" disabled={checking !== null || removing !== null || request.isChecking} onClick={() => void check(request.id)}>
        {checking === request.id ? "Проверяем…" : "Проверить вручную"}</button>
    </article>)}</div>
  </section>;
}
