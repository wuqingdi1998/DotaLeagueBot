import { FiRefreshCw } from "react-icons/fi";
import { FiInfo } from "react-icons/fi";
import { REROLL_REWARD_STAR_THRESHOLD } from "../model/constants";

export function DailyRerollNotice({
  remaining,
  totalStars,
}: {
  remaining: number;
  totalStars: number;
}) {
  const dailyCount = totalStars >= REROLL_REWARD_STAR_THRESHOLD ? 3 : 1;
  return (
    <div className="compendium-daily-notices">
      <div className="compendium-reroll-notice">
        <span className="compendium-reroll-notice-icon">
          <FiRefreshCw aria-hidden="true" />
        </span>
        <div>
          <strong>Реролл задания</strong>
          <span>
            Можно {dailyCount === 1 ? "один раз" : "три раза"} за день заменить
            одну карточку.
          </span>
        </div>
        <span className="compendium-reroll-balance" aria-label={`${remaining} рероллов`}>
          {remaining}
        </span>
      </div>
      <div className="compendium-reroll-notice compendium-verification-notice">
        <span className="compendium-reroll-notice-icon">
          <FiInfo aria-hidden="true" />
        </span>
        <p>
          Учитываются только рейтинговые победы завершенные до{" "}
          <time dateTime="23:59" data-moscow-recurring-time>
            23:59 текущего дня по московскому времени
          </time>
          . Проверка задания может проходить не сразу
        </p>
      </div>
    </div>
  );
}
