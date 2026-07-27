"use client";

import { FiRefreshCw } from "react-icons/fi";

export function BracketToolbar({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="bracket-layout-toolbar">
      <div>
        <strong>Ручная расстановка</strong>
        <span>
          Тяните карточку за значок перемещения. Она прилипнет к ближайшей
          клетке, а новая позиция сохранится автоматически.
        </span>
      </div>
      <button type="button" onClick={onReset}>
        <FiRefreshCw aria-hidden="true" />
        Вернуть авторасстановку
      </button>
      {message && <small aria-live="polite">{message}</small>}
    </div>
  );
}
