import { FiDatabase } from "react-icons/fi";

export default function CompendiumBaseLoading() {
  return (
    <main className="compendium-base-loading" aria-live="polite">
      <FiDatabase aria-hidden="true" />
      <strong>Открываем Базу</strong>
      <span>Загружаем участников и текущие результаты…</span>
    </main>
  );
}
