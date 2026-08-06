import {
  FiCheck,
  FiExternalLink,
  FiLoader,
  FiRefreshCw,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import type { DailyQuest } from "../model/types";
import { HeroChoice } from "./HeroChoice";

export function QuestCard({
  quest,
  rewardStars,
  isChecking,
  isRerolling,
  canCheck,
  hasReroll,
  canReroll,
  onCheck,
  onReroll,
}: {
  quest: DailyQuest;
  rewardStars: number;
  isChecking: boolean;
  isRerolling: boolean;
  canCheck: boolean;
  hasReroll: boolean;
  canReroll: boolean;
  onCheck: (questId: string) => void;
  onReroll: (questId: string) => void;
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
          <button
            className="compendium-reroll-button"
            type="button"
            disabled={!canReroll || Boolean(quest.completion)}
            onClick={() => onReroll(quest.id)}
            aria-label={`Заменить испытание ${quest.position}`}
            title={
              quest.completion
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
          <div
            className="compendium-reward"
            aria-label={`Награда: ${rewardStars} ${rewardStars === 1 ? "звезда" : "звезды"}`}
          >
            <FaStar aria-hidden="true" />
            <strong>{rewardStars}</strong>
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
        Победите в рейтинговом матче на одном из этих героев
      </p>

      {quest.completion ? (
        <div className="compendium-completion" role="status">
          <span className="compendium-checkmark"><FiCheck aria-hidden="true" /></span>
          <div>
            <strong>Задание выполнено</strong>
            {matchedHero && <span>Победа на герое {matchedHero.name}</span>}
            <a
              href={`https://www.opendota.com/matches/${quest.completion.matchedMatchId}`}
              target="_blank"
              rel="noreferrer"
            >
              Матч {quest.completion.matchedMatchId} <FiExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : (
        <button
          className="compendium-check-button"
          type="button"
          disabled={!canCheck || isChecking}
          onClick={() => onCheck(quest.id)}
        >
          {isChecking ? (
            <><FiLoader className="compendium-spinner" aria-hidden="true" /> Проверяем…</>
          ) : (
            "Проверить"
          )}
        </button>
      )}
    </article>
  );
}
