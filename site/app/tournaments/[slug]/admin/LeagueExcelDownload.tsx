"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import { downloadLeagueExcel } from "../services/league-excel";

export function LeagueExcelDownload({ slug, title }: { slug: string; title: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setIsDownloading(true);
    setError("");
    try {
      await downloadLeagueExcel(slug, title);
    } catch {
      setError("Не удалось скачать таблицу. Попробуйте ещё раз или обновите страницу.");
    } finally {
      setIsDownloading(false);
    }
  }

  return <>
    <button type="button" disabled={isDownloading} onClick={() => void download()}>
      {isDownloading ? "Готовим Excel…" : "Скачать Excel"} <FiDownload aria-hidden="true" />
    </button>
    {error && <span role="alert">{error}</span>}
  </>;
}
