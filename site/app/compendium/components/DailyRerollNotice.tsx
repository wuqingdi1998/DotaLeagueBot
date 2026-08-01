import { FiRefreshCw } from "react-icons/fi";

export function DailyRerollNotice({ remaining }: { remaining: number }) {
  return (
    <div className="compendium-reroll-notice">
      <span className="compendium-reroll-notice-icon">
        <FiRefreshCw aria-hidden="true" />
      </span>
      <div>
        <strong>Реролл задания</strong>
        <span>
          Позволяет один раз за день заменить одну карточку с заданием.
        </span>
      </div>
      <span className="compendium-reroll-balance" aria-label={`${remaining} рероллов`}>
        {remaining}
      </span>
    </div>
  );
}
