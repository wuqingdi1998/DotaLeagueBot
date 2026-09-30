import { FaStar } from "react-icons/fa";
import { FiUsers, FiX } from "react-icons/fi";
import { OCTOBER_CLAN_QUEST_POSITION } from "../model/preview";

export function OctoberClanOutingCard({
  isNoteVisible = true,
  onDismissNote,
}: {
  isNoteVisible?: boolean;
  onDismissNote?: () => void;
}) {
  return (
    <article className="compendium-quest october-clan-quest">
      <div className="compendium-quest-heading">
        <div>
          <span>Ежедневное задание</span>
          <h2>Испытание {OCTOBER_CLAN_QUEST_POSITION}</h2>
        </div>
        <div className="compendium-reward" aria-label="Награда: 1 звезда каждому, в выходные 2">
          <FaStar aria-hidden="true" />
          <strong>1–2</strong>
        </div>
      </div>
      <div className="october-clan-quest-emblem" aria-hidden="true">
        <FiUsers />
      </div>
      <h3>Клановая вылазка</h3>
      <p className="compendium-condition">
        Выиграйте одну рейтинговую игру вместе с участником своего клана.
      </p>
      {isNoteVisible && (
        <div className="october-clan-quest-note october-dismissible-guide">
          <p>
            Задание закроется у обоих игроков: в пятницу, субботу и воскресенье каждый получит
            по две звезды, в остальные дни – по одной. Эту же победу можно одновременно засчитать
            для испытания 1 или 2, если выполнены их условия.
          </p>
          <button type="button" aria-label="Скрыть пояснение к клановой вылазке" onClick={onDismissNote}>
            <FiX aria-hidden="true" />
          </button>
        </div>
      )}
      <button className="compendium-check-button" type="button" disabled>
        Пока не открыто
      </button>
    </article>
  );
}
