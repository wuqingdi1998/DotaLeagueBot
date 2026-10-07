"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";
import { fetchSiteRequest } from "@/lib/site-request";
import { OCTOBER_CLANS, type OctoberClanId } from "../model/clans";
import type { OctoberLaunchReport } from "../model/launch-report";
import { OCTOBER_CLAN_PUBLICATION_AT } from "../model/release";

const statusText: Record<OctoberLaunchReport["status"], string> = {
  pending: "Ожидает подготовки 4 октября в 23:30",
  preparing: "Собираем данные и готовим распределение",
  review: "Распределение готово – требуется ваше решение",
  approved: "Запуск подтверждён на 5 октября в 00:00",
  cancelled: "Запуск отменён организатором",
  publishing: "Публикуем кланы и задания",
  complete: "Компендиум запущен",
  failed: "При подготовке произошла ошибка",
};

function moscowDateTime(value: string | null): string {
  if (!value) return "–";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function clanName(clanId: OctoberClanId): string {
  return OCTOBER_CLANS.find((clan) => clan.id === clanId)?.name ?? clanId;
}

export function OctoberLaunchCenter({ initialReport }: { initialReport: OctoberLaunchReport }) {
  const [report, setReport] = useState(initialReport);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isAfterStart, setIsAfterStart] = useState(false);
  const shouldPoll = ["pending", "preparing", "approved", "publishing"].includes(report.status);

  useEffect(() => {
    const refreshStartState = () => {
      setIsAfterStart(Date.now() >= Date.parse(OCTOBER_CLAN_PUBLICATION_AT));
    };
    refreshStartState();
    const timer = window.setInterval(refreshStartState, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = window.setInterval(async () => {
      const response = await fetchSiteRequest("/api/admin/compendium-october-launch", {
        cache: "no-store",
      });
      const result = await response.json() as { report?: OctoberLaunchReport };
      if (response.ok && result.report) setReport(result.report);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [shouldPoll]);

  const totalPlayers = report.clans.morbus.playerCount + report.clans.panacea.playerCount;
  const totalReserved = report.clans.morbus.reservedCount + report.clans.panacea.reservedCount;

  async function decide(decision: "approve" | "cancel") {
    const startsImmediately = Date.now() >= Date.parse(OCTOBER_CLAN_PUBLICATION_AT);
    const question = decision === "approve"
      ? startsImmediately
        ? "Опубликовать распределение и открыть задания прямо сейчас?"
        : "Подтвердить публикацию распределения и заданий 5 октября в 00:00?"
      : "Отменить запуск? Без нового решения распределение и задания не откроются.";
    if (!window.confirm(question)) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetchSiteRequest("/api/admin/compendium-october-launch", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json() as { error?: string; report?: OctoberLaunchReport };
      if (!response.ok || !result.report) {
        throw new Error(result.error ?? "Не удалось сохранить решение");
      }
      setReport(result.report);
      setMessage(decision === "approve"
        ? startsImmediately
          ? "Запуск подтверждён и опубликован."
          : "Запуск подтверждён. Публикация произойдёт в 00:00."
        : "Запуск отменён. Участникам распределение и задания не откроются.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить решение");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="october-launch-center">
      <header className="october-launch-heading">
        <Link href="/organizer/compendium-october"><FiArrowLeft /> Новый компендиум</Link>
        <span>Только для организатора</span>
        <h1>Центр запуска</h1>
        <p>Здесь фиксируется предварительное распределение. Участники ничего не увидят, пока вы не подтвердите запуск.</p>
      </header>

      <section className={`october-launch-status is-${report.status}`}>
        <div>{report.status === "cancelled" ? <FiXCircle /> : report.status === "complete" ? <FiCheckCircle /> : <FiClock />}</div>
        <span><small>Текущее состояние</small><strong>{statusText[report.status]}</strong></span>
        <time>{report.preparedAt ? `Отчёт: ${moscowDateTime(report.preparedAt)} МСК` : "Отчёт ещё не создан"}</time>
      </section>

      {report.errorMessage && (
        <div className="october-launch-warning"><FiAlertTriangle /><span><strong>Ошибка подготовки</strong>{report.errorMessage}</span></div>
      )}

      {report.players.length === 0 ? (
        <section className="october-launch-empty">
          <h2>Отчёт появится 4 октября в 23:30</h2>
          <p>Система закроет выбор кланов, соберёт активность за 90 дней, рассчитает предварительные составы и отправит вам ссылку в личные сообщения Discord.</p>
        </section>
      ) : (
        <>
          <section className="october-launch-summary" aria-label="Краткий итог распределения">
            <div><span>Участников</span><strong>{totalPlayers}</strong></div>
            <div><span>Выбрали клан сами</span><strong>{totalReserved}</strong></div>
            <div><span>Распределены автоматически</span><strong>{totalPlayers - totalReserved}</strong></div>
            <div className={report.unavailableActivityCount ? "has-warning" : ""}>
              <span>Без данных OpenDota</span><strong>{report.unavailableActivityCount}</strong>
            </div>
          </section>

          <section className="october-launch-balance">
            <div>
              <h2>Баланс кланов</h2>
              <p>Численность выравнивается первой. Среди доступных кланов игрок направляется туда, где перед его назначением меньше суммарный балл активности.</p>
            </div>
            <div className="october-launch-clan-cards">
              {OCTOBER_CLANS.map((clan) => {
                const summary = report.clans[clan.id];
                return (
                  <article key={clan.id}>
                    <h3>{clan.name}</h3>
                    <strong>{summary.playerCount} участников</strong>
                    <span>Баллы: {summary.totalActivityScore.toFixed(2)}</span>
                    <span>Матчи за 90 дней: {summary.matchesLastThreeMonths}</span>
                    <span>Из них рейтинговых: {summary.rankedMatchesLastThreeMonths}</span>
                  </article>
                );
              })}
            </div>
            <details>
              <summary>Как считается балл активности</summary>
              <p>Рейтинговые матчи за 90 дней × 2 + все матчи за 90 дней × 0,25 + внутренний рейтинг ÷ 1000 + ранг ÷ 10.</p>
              <p>Если OpenDota не ответила, матчи не считаются нулевой активностью: игрок отмечается предупреждением, а решение опирается на остальные доступные показатели.</p>
            </details>
          </section>

          <section className="october-launch-roster">
            <h2>Почему распределён каждый участник</h2>
            <div className="october-launch-table-wrap">
              <table>
                <thead><tr><th>Участник</th><th>Клан</th><th>Источник</th><th>Балл</th><th>Матчи 90 дней</th><th>Уровень</th><th>Объяснение</th></tr></thead>
                <tbody>
                  {report.players.map((player) => (
                    <tr key={player.discordId}>
                      <td><strong>{player.playerName}</strong><small>Dota ID: {player.dotaId}</small></td>
                      <td>{clanName(player.clanId)}</td>
                      <td>{player.source === "reservation" ? "Личный выбор" : `Автоматически № ${player.decisionOrder}`}</td>
                      <td>{player.activityScore.toFixed(2)}</td>
                      <td>
                        {player.openDotaStatus === "available"
                          ? <>{player.matchesLastThreeMonths} всего · {player.rankedMatchesLastThreeMonths} рейтинговых<small>Последний: {moscowDateTime(player.lastMatchAt)}</small></>
                          : <span className="october-launch-missing">OpenDota не ответила</span>}
                      </td>
                      <td>Рейтинг: {player.internalRating}<small>Ранг: {player.rankTier}</small></td>
                      <td>{player.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {report.status === "review" && (
        <section className="october-launch-decision">
          <h2>Ваше решение</h2>
          <p>После подтверждения черновик больше не пересчитывается. До 00:00 он останется скрытым от участников.</p>
          <div>
            <button type="button" disabled={isSaving} onClick={() => void decide("approve")}>
              {isSaving ? "Сохраняем…" : isAfterStart ? "Запустить сейчас" : "Подтвердить запуск 5 октября в 00:00"}
            </button>
            <button className="is-cancel" type="button" disabled={isSaving} onClick={() => void decide("cancel")}>
              Отменить запуск
            </button>
          </div>
        </section>
      )}
      {report.decisionAt && <p className="october-launch-decision-note">Решение принято {moscowDateTime(report.decisionAt)} МСК{report.decidedByName ? ` · ${report.decidedByName}` : ""}.</p>}
      {message && <div className="october-launch-message" role="status">{message}</div>}
    </main>
  );
}
