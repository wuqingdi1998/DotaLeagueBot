import type { ReactNode } from "react";
import { FaStar } from "react-icons/fa";
import { FiCheck, FiExternalLink, FiLoader, FiUsers, FiX } from "react-icons/fi";
import { OCTOBER_CLAN_QUEST_POSITION } from "../model/preview";
import type { ClanOutingCompletion } from "@/app/compendium/services/clan-outing-repository";

export function OctoberClanOutingCard({
  rewardStars = 1,
  isNoteVisible = true,
  onDismissNote,
  overlay,
  completion,
  isChecking = false,
  canCheck = false,
  onCheck,
}: {
  rewardStars?: 1 | 2;
  isNoteVisible?: boolean;
  onDismissNote?: () => void;
  overlay?: ReactNode;
  completion?: ClanOutingCompletion | null;
  isChecking?: boolean;
  canCheck?: boolean;
  onCheck?: () => void;
}) {
  return (
    <article className="compendium-quest october-clan-quest">
      <div className="compendium-quest-heading">
        <div>
          <span>Ежедневное задание</span>
          <h2>Испытание {OCTOBER_CLAN_QUEST_POSITION}</h2>
        </div>
        <div className="compendium-reward" aria-label={`Награда: ${rewardStars} ${rewardStars === 1 ? "звезда" : "звезды"} каждому`}>
          <FaStar aria-hidden="true" />
          <strong>{rewardStars}</strong>
        </div>
      </div>
      <div className="october-clan-quest-emblem" aria-hidden="true">
        <FiUsers />
      </div>
      <h3>Клановая вылазка</h3>
      <p className="compendium-condition">
        Выиграйте один рейтинговый или обычный All Pick матч вместе с участником своего клана.
      </p>
      {isNoteVisible && (
        <div className="october-clan-quest-note october-dismissible-guide">
          <p>
            Задание закроется у обоих игроков: в субботу и воскресенье каждый получит
            по две звезды, в остальные дни – по одной. Эту же победу можно одновременно засчитать
            для испытания 1 или 2, если выполнены их условия.
          </p>
          <button type="button" aria-label="Скрыть пояснение к клановой вылазке" onClick={onDismissNote}>
            <FiX aria-hidden="true" />
          </button>
        </div>
      )}
      {completion ? (
        <div className="compendium-completion" role="status">
          <span className="compendium-checkmark"><FiCheck aria-hidden="true" /></span>
          <div>
            <strong>Вылазка выполнена вместе с {completion.partnerName}</strong>
            <a href={`https://www.opendota.com/matches/${completion.matchId}`} target="_blank" rel="noreferrer">
              Матч {completion.matchId} <FiExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : (
        <button
          className="compendium-check-button"
          type="button"
          disabled={!canCheck || isChecking}
          onClick={onCheck}
        >
          {isChecking ? <><FiLoader className="compendium-spinner" aria-hidden="true" /> Проверяем…</> : canCheck ? "Проверить" : "Пока не открыто"}
        </button>
      )}
      {overlay}
    </article>
  );
}
