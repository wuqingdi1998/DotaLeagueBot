import { FiLock } from "react-icons/fi";

export function OctoberLockedDailyQuests() {
  return (
    <div className="compendium-quest-grid quest-count-2 october-locked-daily-grid">
      {[1, 2].map((position) => (
        <article className="compendium-quest october-locked-daily-quest" key={position}>
          <FiLock aria-hidden="true" />
          <span>Ежедневное задание</span>
          <h2>Испытание {position}</h2>
          <p>Задание появится 5 октября в 00:00 по московскому времени.</p>
        </article>
      ))}
    </div>
  );
}
