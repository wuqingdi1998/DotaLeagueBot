/// <reference types="chrome" />
import { dotabuffBrowserMatchUrl, DOTABUFF_BROWSER_MAX_PAGES, DOTABUFF_BROWSER_MAX_MATCHES } from "../../lib/season-ranked-wins/browser-import";
import { isJobExpired, isJobPage, isLeagueSender, publicJobStatus, type DotabuffJob } from "./model";

const JOB_KEY = "activeJob";
let queue = Promise.resolve();

async function getJob(): Promise<DotabuffJob | undefined> {
  return (await chrome.storage.session.get(JOB_KEY))[JOB_KEY] as DotabuffJob | undefined;
}
async function putJob(job: DotabuffJob) {
  await chrome.storage.session.set({ [JOB_KEY]: job });
}
async function failJob(job: DotabuffJob, message: string) {
  await putJob({ ...job, state: "error", message });
}

async function externalMessage(message: Record<string, unknown>, sender: chrome.runtime.MessageSender) {
  if (!isLeagueSender(sender.url) || sender.frameId !== 0 || !sender.tab?.id) throw new Error("Нет доступа");
  if (message.type === "ping") return { ok: true, version: chrome.runtime.getManifest().version };
  const job = await getJob();
  if (message.type === "start") {
    if (typeof message.dotaId !== "string" || !/^\d{1,10}$/.test(message.dotaId)
      || typeof message.id !== "string" || !/^[a-f\d-]{36}$/i.test(message.id)) throw new Error("Некорректный игрок");
    if (job && !isJobExpired(job) && ["waiting", "reading"].includes(job.state)) {
      throw new Error("Уже выполняется проверка Dotabuff. Завершите её или отмените на сайте лиги");
    }
    const tab = await chrome.tabs.create({ url: "about:blank", active: true });
    if (!tab.id) throw new Error("Не удалось открыть Dotabuff");
    const next: DotabuffJob = { id: message.id, dotaId: message.dotaId, ownerTabId: sender.tab.id,
      dotabuffTabId: tab.id, page: 1, startedAt: new Date().toISOString(), state: "waiting", matches: [],
      message: "Пройдите проверку в открытой вкладке Dotabuff. Сбор продолжится автоматически" };
    await putJob(next);
    await chrome.tabs.update(tab.id, { url: dotabuffBrowserMatchUrl(next.dotaId, 1) });
    return { ok: true };
  }
  if (!job || job.id !== message.id || job.ownerTabId !== sender.tab.id) throw new Error("Проверка не найдена. Начните её заново");
  if (message.type === "cancel") {
    await failJob(job, "Проверка отменена. Прежние значения сохранены");
    return { ok: true };
  }
  if (message.type !== "status") throw new Error("Неизвестный запрос");
  if (isJobExpired(job) && !["complete", "error"].includes(job.state)) {
    await failJob(job, "Время ожидания истекло. Нажмите Dotabuff ещё раз");
    return publicJobStatus((await getJob())!);
  }
  return publicJobStatus(job);
}

async function contentMessage(message: Record<string, unknown>, sender: chrome.runtime.MessageSender) {
  const job = await getJob();
  if (!job || sender.tab?.id !== job.dotabuffTabId || sender.frameId !== 0 || !isJobPage(sender.url, job)
    || isJobExpired(job) || !["waiting", "reading"].includes(job.state)) return null;
  if (message.type === "getJob") return { id: job.id, page: job.page, startedAt: job.startedAt };
  if (message.id !== job.id || message.page !== job.page) return null;
  if (message.type === "waiting") {
    await putJob({ ...job, state: "waiting", message: "Dotabuff просит пройти проверку в открытой вкладке. Ожидаем вас…" });
    return { ok: true };
  }
  if (message.type === "error") {
    await failJob(job, typeof message.error === "string" ? message.error.slice(0,500) : "Не удалось прочитать Dotabuff");
    return { ok: true };
  }
  if (message.type !== "page" || !Array.isArray(message.matches) || message.matches.length > DOTABUFF_BROWSER_MAX_MATCHES) return null;
  const matches = new Map(job.matches.map((match) => [match.matchId, match]));
  const oldSize = matches.size;
  for (const match of message.matches) matches.set(match.matchId, match);
  if (matches.size > DOTABUFF_BROWSER_MAX_MATCHES) throw new Error("Слишком много матчей для одной проверки");
  job.matches = [...matches.values()];
  if (message.hasNextPage === true) {
    if (job.page >= DOTABUFF_BROWSER_MAX_PAGES || matches.size === oldSize) {
      await failJob(job, "Не удалось получить все страницы Dotabuff. Прежние значения сохранены");
      return { ok: false };
    }
    job.page += 1;
    job.state = "reading";
    job.message = `Читаем страницу ${job.page} Dotabuff…`;
    await putJob(job);
    await chrome.tabs.update(job.dotabuffTabId, { url: dotabuffBrowserMatchUrl(job.dotaId, job.page) });
  } else {
    job.state = "complete";
    job.message = "Статистика собрана. Возвращаемся на сайт лиги";
    job.result = { dotaId: job.dotaId, startedAt: job.startedAt, completedAt: new Date().toISOString(), matches: job.matches };
    await putJob(job);
    await chrome.tabs.update(job.ownerTabId, { active: true }).catch(() => undefined);
  }
  return { ok: true };
}

function enqueue(action: () => Promise<unknown>, respond: (response: unknown) => void) {
  queue = queue.then(action).then(respond, (error) => respond({ error: error instanceof Error ? error.message : "Ошибка расширения" }));
}
chrome.runtime.onMessageExternal.addListener((message, sender, respond) => {
  enqueue(() => externalMessage(message ?? {}, sender), respond);
  return true;
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  enqueue(() => contentMessage(message ?? {}, sender), respond);
  return true;
});
chrome.tabs.onRemoved.addListener((tabId) => {
  enqueue(async () => {
    const job = await getJob();
    if (job && ["waiting", "reading"].includes(job.state) && [job.ownerTabId, job.dotabuffTabId].includes(tabId)) {
      await failJob(job, "Вкладка закрыта. Прежние значения сохранены. Нажмите Dotabuff для новой попытки");
    }
  }, () => undefined);
});
