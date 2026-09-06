/// <reference types="chrome" />
import identity from "../../../../extensions/dotabuff/identity.json";
import { DOTABUFF_BROWSER_TIMEOUT_MS, parseDotabuffBrowserImport, type DotabuffBrowserImport } from "@/lib/season-ranked-wins/browser-import";

export class DotabuffExtensionMissingError extends Error {}

function extensionMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new DotabuffExtensionMissingError("Установите расширение Dotabuff, затем обновите страницу"));
      return;
    }
    const timer = setTimeout(() => reject(new Error("Расширение не ответило. Обновите страницу и повторите проверку")), 10_000);
    chrome.runtime.sendMessage(identity.id, message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError || !response) {
        reject(new DotabuffExtensionMissingError("Расширение Dotabuff не подключено. Установите его и обновите страницу"));
      } else if (response.error) reject(new Error(String(response.error)));
      else resolve(response);
    });
  });
}

function waitForStatus(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new Error("Проверка отменена")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 1_000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function collectDotabuffBrowserWins(
  dotaId: string,
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<DotabuffBrowserImport> {
  await extensionMessage({ type: "ping" });
  if (signal.aborted) throw new Error("Проверка отменена");
  const id = crypto.randomUUID();
  const cancel = () => { void extensionMessage({ type: "cancel", id }).catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await extensionMessage({ type: "start", id, dotaId });
    onProgress("Пройдите проверку в открытой вкладке Dotabuff. После неё победы загрузятся автоматически");
    const deadline = Date.now() + DOTABUFF_BROWSER_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await waitForStatus(signal);
      const status = await extensionMessage({ type: "status", id });
      if (signal.aborted) throw new Error("Проверка отменена");
      if (typeof status.message === "string") onProgress(status.message);
      if (status.state === "error") throw new Error(String(status.message));
      if (status.state === "complete") {
        const result = parseDotabuffBrowserImport(status.result);
        if (!result || result.dotaId !== dotaId) throw new Error("Расширение вернуло неверную статистику. Прежние значения сохранены");
        return result;
      }
    }
    cancel();
    throw new Error("Время проверки Dotabuff истекло. Нажмите кнопку ещё раз");
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}
