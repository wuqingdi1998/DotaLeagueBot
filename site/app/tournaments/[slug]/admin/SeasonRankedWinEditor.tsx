"use client";

import { useId, useRef } from "react";
import { FiSettings, FiX } from "react-icons/fi";
import { parsePlayerPositions, SEASON_RANKED_WIN_WINDOW_DAYS } from "@/lib/season-ranked-wins/model";
import { MAX_MANUAL_RANKED_WINS, type RankedWinUpdateSource } from "@/lib/season-ranked-wins/organizer-model";
import { useTournament } from "../hooks/TournamentContext";
import { useRankedWinEditor } from "../hooks/useRankedWinEditor";
import { buildDotabuffRankedMatchesUrl } from "../model/season-registration";
import type { SeasonRoundRegistration } from "../model/season-types";

export function SeasonRankedWinEditor({ registration }: { registration: SeasonRoundRegistration }) {
  const { season, setToast } = useTournament();
  const editor = useRankedWinEditor(registration, season.load);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const positions = parsePlayerPositions(registration.positions);
  const isSaving = editor.pendingSource !== null || editor.isSendingWarning;
  if (!season.data?.isOrganizer) return null;

  async function save(source: RankedWinUpdateSource) {
    if (await editor.save(source)) {
      dialogRef.current?.close();
      setToast(`Победы ${registration.nickname} обновлены`);
    }
  }

  async function sendWarning() {
    const result = await editor.sendWarning();
    if (!result) return;
    dialogRef.current?.close();
    setToast(result.alreadySent
      ? `Предупреждение ${registration.nickname} уже отправлялось`
      : `Предупреждение ${registration.nickname} отправлено`);
  }

  return (
    <>
      <button
        type="button" className="season-ranked-win-settings"
        title={`Обновить победы ${registration.nickname}`}
        aria-label={`Обновить победы ${registration.nickname}`}
        aria-haspopup="dialog"
        onClick={() => { editor.reset(); dialogRef.current?.showModal(); }}
      >
        <FiSettings aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef} className="season-ranked-win-dialog" aria-labelledby={titleId}
        onCancel={(event) => { if (isSaving) event.preventDefault(); }}
      >
        <button type="button" className="modal-close" aria-label="Закрыть"
          disabled={isSaving} onClick={() => dialogRef.current?.close()}>
          <FiX aria-hidden="true" />
        </button>
        <h3 id={titleId}>Победы {registration.nickname}</h3>
        <p>Рейтинговые победы за последние {SEASON_RANKED_WIN_WINDOW_DAYS} дней</p>
        <div className="season-ranked-win-sources">
          <button type="button" className="secondary-button" disabled={isSaving || !positions}
            onClick={() => void save("stratz")}>
            {editor.pendingSource === "stratz" ? "Загрузка STRATZ…" : "STRATZ"}
          </button>
          <a className="secondary-button"
            href={buildDotabuffRankedMatchesUrl(registration.dota_id)}
            target="_blank" rel="noopener noreferrer">
            Dotabuff
          </a>
          <button type="button" className="secondary-button" disabled={isSaving || !positions}
            aria-expanded={editor.isManual} onClick={() => editor.setIsManual(true)}>
            Внести вручную
          </button>
          <button type="button" className="secondary-button season-ranked-win-warning-button"
            disabled={isSaving} title="Отправить предупреждение о рейтинговых победах"
            aria-label={`Предупредить ${registration.nickname}`}
            onClick={() => void sendWarning()}>
            {editor.isSendingWarning ? "…" : "!"}
          </button>
        </div>
        {!positions && <p role="alert">Сначала укажите две роли в профиле игрока</p>}
        {editor.isManual && positions && (
          <form className="season-ranked-win-form" onSubmit={(event) => { event.preventDefault(); void save("manual"); }}>
            <label>
              <span>Основная роль · {positions.primaryRole} позиция</span>
              <input type="number" min={0} max={MAX_MANUAL_RANKED_WINS} step={1} required
                value={editor.primaryWins} disabled={isSaving}
                onChange={(event) => editor.setPrimaryWins(event.target.value)} />
            </label>
            <label>
              <span>Дополнительная роль · {positions.secondaryRole} позиция</span>
              <input type="number" min={0} max={MAX_MANUAL_RANKED_WINS} step={1} required
                value={editor.secondaryWins} disabled={isSaving}
                onChange={(event) => editor.setSecondaryWins(event.target.value)} />
            </label>
            <p>Ручные значения фиксируются только для этого тура.</p>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {editor.pendingSource === "manual" ? "Сохраняем…" : "Сохранить победы"}
            </button>
          </form>
        )}
        {editor.error && <p className="season-ranked-win-error" role="alert">{editor.error}</p>}
        {editor.pendingSource && <p role="status">Обновляем статистику…</p>}
        {editor.isSendingWarning && <p role="status">Отправляем предупреждение…</p>}
      </dialog>
    </>
  );
}
