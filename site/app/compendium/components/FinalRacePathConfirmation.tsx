import { useEffect, useId, useRef } from "react";
import type { FinalRacePath } from "../model/final-star-race-definitions";

export function FinalRacePathConfirmation({ path, onClose, onConfirm, isBusy = false }: {
  path: FinalRacePath;
  isBusy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isCore = path === "core";

  useEffect(() => { dialogRef.current?.showModal(); }, []);

  return <dialog ref={dialogRef} className="compendium-final-race-confirmation" aria-labelledby={titleId} aria-describedby={descriptionId}
    onClose={onClose} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialogRef.current?.close();
    }}>
    <h2 id={titleId}>Хотите выбрать {isCore ? "Путь Разрушения" : "Путь Созидания"}?</h2>
    <div id={descriptionId}>
      <p>Задания недели будут более подходящими для игроков {isCore ? "основы" : "поддержки"}.</p>
      <p><strong>Выбор окончательный и его нельзя будет изменить.</strong></p>
    </div>
    <div className="compendium-final-race-confirmation-actions">
      <button disabled={isBusy} type="button" className="secondary-button" onClick={() => dialogRef.current?.close()}>Отмена</button>
      <button disabled={isBusy} type="button" className="primary-button" onClick={onConfirm}>{isBusy ? "Сохраняем…" : "Выбрать путь"}</button>
    </div>
  </dialog>;
}
