import { FiCheck, FiExternalLink, FiLoader } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import type { DailyQuest } from "../model/types";
import { HeroChoice } from "./HeroChoice";

export function QuestCard({
  quest,
  isChecking,
  canCheck,
  onCheck,
}: {
  quest: DailyQuest;
  isChecking: boolean;
  canCheck: boolean;
  onCheck: (questId: string) => void;
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
        <div className="compendium-reward" aria-label="Награда: одна звезда">
          <FaStar aria-hidden="true" />
          <strong>1</strong>
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
