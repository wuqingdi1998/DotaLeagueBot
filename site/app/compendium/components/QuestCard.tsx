import type { ReactNode } from "react";
import {
  FiCheck,
  FiExternalLink,
  FiLoader,
  FiRefreshCw,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import type { DailyQuest } from "../model/types";
import { DailyResetCountdown } from "./DailyResetCountdown";
import { HeroChoice } from "./HeroChoice";

export function QuestCard({
  quest,
  rewardStars,
  rewardStarsLabel,
  isChecking,
  isRerolling,
  canCheck,
  hasReroll,
  rerollsRemaining,
  canReroll,
  onCheck,
  onReroll,
  isPreview = false,
  previewActionLabel = "Пока не открыто",
  resetCountdown,
  overlay,
}: {
  quest: DailyQuest;
  rewardStars: number;
  rewardStarsLabel?: string;
  isChecking: boolean;
  isRerolling: boolean;
  canCheck: boolean;
  hasReroll: boolean;
  rerollsRemaining?: number;
  canReroll: boolean;
  onCheck: (questId: string) => void;
  onReroll: (questId: string) => void;
  isPreview?: boolean;
  previewActionLabel?: string;
  resetCountdown?: string;
  overlay?: ReactNode;
}) {
  const matchedHero = quest.heroes.find(
    (hero) => hero.id === quest.completion?.matchedHeroId,
  );
  return (
    <article className={`compendium-quest${quest.completion ? " completed" : ""}`}>
      <div className="compendium-quest-heading">
        <div>
          <span>Ежедневное задание</span>
          <h2>Испытание {quest.position}</h2>
        </div>
        <div className="compendium-quest-heading-actions">
          <div className="compendium-reroll-control">
            <button
              className="compendium-reroll-button"
              type="button"
              disabled={isPreview || !canReroll || Boolean(quest.completion)}
              onClick={() => onReroll(quest.id)}
              aria-label={`Заменить испытание ${quest.position}. Осталось замен: ${rerollsRemaining ?? 0}`}
              title={
                isPreview
                  ? "Закрытый просмотр: замена заданий пока недоступна"
                  : quest.completion
                  ? "Выполненное задание нельзя заменить"
                  : !hasReroll
                    ? "Рероллов на сегодня не осталось"
                    : canReroll
                    ? "Использовать ежедневный реролл"
                    : "Дождитесь завершения текущего действия"
              }
            >
              {isRerolling ? (
                <FiLoader className="compendium-spinner" aria-hidden="true" />
              ) : (
                <FiRefreshCw aria-hidden="true" />
              )}
            </button>
            {rerollsRemaining !== undefined && (
              <span className="compendium-reroll-count" aria-hidden="true">
                ×{rerollsRemaining}
              </span>
            )}
          </div>
          <div
            className="compendium-reward"
            aria-label={rewardStarsLabel
              ? `Награда: ${rewardStarsLabel} звезды`
              : `Награда: ${rewardStars} ${rewardStars === 1 ? "звезда" : "звезды"}`}
          >
            <FaStar aria-hidden="true" />
            {rewardStarsLabel
              ? <strong>{rewardStarsLabel}</strong>
              : <strong>{rewardStars}</strong>}
          </div>
        </div>
      </div>

      <div className="compendium-heroes">
        {quest.heroes.map((hero) => (
          <HeroChoice
            key={hero.id}
            hero={hero}
            isMatched={hero.id === quest.completion?.matchedHeroId}
          />
        ))}
      </div>

      <p className="compendium-condition">
        Победите в рейтинговом или обычном All Pick матче на одном из этих героев
      </p>

      {quest.completion ? (
        <div className="compendium-card-completed-state">
          <div className="compendium-completion" role="status">
            <span className="compendium-checkmark"><FiCheck aria-hidden="true" /></span>
            <div>
              <strong>Задание выполнено</strong>
              {matchedHero && <span>Победа на герое {matchedHero.name}</span>}
              {quest.completion.matchedMatchId ? (
                <a
                  href={`https://www.opendota.com/matches/${quest.completion.matchedMatchId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Матч {quest.completion.matchedMatchId} <FiExternalLink aria-hidden="true" />
                </a>
              ) : (
                <span>Засчитано организатором</span>
              )}
            </div>
          </div>
          {resetCountdown && (
            <DailyResetCountdown
              countdown={resetCountdown}
              className="compendium-card-reset-countdown"
            />
          )}
        </div>
      ) : (
        <button
          className="compendium-check-button"
          type="button"
          disabled={isPreview || !canCheck || isChecking}
          onClick={() => onCheck(quest.id)}
        >
          {isPreview ? (
            previewActionLabel
          ) : isChecking ? (
            <><FiLoader className="compendium-spinner" aria-hidden="true" /> Проверяем…</>
          ) : (
            "Проверить"
          )}
        </button>
      )}
      {overlay}
    </article>
  );
}
