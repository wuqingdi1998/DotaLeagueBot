"use client";

import { useRef, useState } from "react";
import { FiInfo, FiX } from "react-icons/fi";
import type { ReleaseComparison } from "@/lib/development/releases";

export function DevelopmentInfoButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [comparison, setComparison] = useState<ReleaseComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function openChanges() {
    dialog.current?.showModal();
    setIsLoading(true);
    setError("");
    setComparison(null);
    try {
      const response = await fetch("/api/development/changes", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить отличия. Проверьте вход и попробуйте ещё раз.");
      setComparison(await response.json() as ReleaseComparison);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Сравнение временно недоступно");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button className="development-info-button" onClick={openChanges} aria-label="Отличия тестового сайта от основного">
        <span>DEV</span><FiInfo aria-hidden="true" />
      </button>
      <dialog ref={dialog} className="development-info-dialog" aria-labelledby="development-changes-title">
        <header>
          <h2 id="development-changes-title">Что изменится на основном сайте</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть отличия"><FiX /></button>
        </header>
        <p>Это тестовый сайт. Обновления попадают на основной только после вашей команды на публикацию.</p>
        <p>Пробные результаты, настройки и файлы остаются здесь. На основной сайт переносится программа.</p>
        {isLoading && <p role="status">Сравниваем с работающим сайтом…</p>}
        {error && <p role="alert">{error}</p>}
        {comparison && (
          <>
            <dl className="development-versions">
              <div><dt>Тестовая версия</dt><dd>{comparison.developmentRevision.slice(0, 8)}</dd></div>
              <div><dt>Основной сайт</dt><dd>{comparison.productionRevision?.slice(0, 8) ?? "Не удалось проверить"}</dd></div>
            </dl>
            {comparison.status === "equal" && <p role="status">Версии совпадают. Неопубликованных обновлений нет.</p>}
            {comparison.status === "unavailable" && <p role="alert">Точное сравнение недоступно. Обновите тестовую версию перед публикацией.</p>}
            {comparison.status === "ahead" && (
              <section>
                <h3>Подготовлено обновлений: {comparison.changes.length}</h3>
                <ol>{comparison.changes.map((change) => <li key={change.revision}>{change.title}</li>)}</ol>
              </section>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
