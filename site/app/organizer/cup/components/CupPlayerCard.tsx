import { FiCheck, FiMove, FiX } from "react-icons/fi";
import type { CupPlayer } from "../model/cup-board";

export function CupPlayerCard({ player, isReady, isSelected, isDisabled, onSelect, onToggleReady, onRemove }: {
  player: CupPlayer;
  isReady: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
  onToggleReady: () => void;
  onRemove: () => void;
}) {
  return (
    <article className={`cup-player-card${isSelected ? " is-selected" : ""}`} data-player-id={player.id}
      draggable={!isDisabled}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", player.id);
        event.dataTransfer.effectAllowed = "move";
      }}>
      <button className={`cup-ready${isReady ? " is-ready" : ""}`} type="button"
        aria-label={`Готовность: ${player.nickname}`} aria-pressed={isReady} disabled={isDisabled}
        title={isReady ? "Готов играть – нажмите, чтобы отменить" : "Нажмите, чтобы подтвердить готовность"}
        onClick={onToggleReady}>{isReady && <FiCheck aria-hidden="true" />}</button>
      <div className="cup-player-select" role="button" tabIndex={isDisabled ? -1 : 0}
        onClick={() => { if (!isDisabled) onSelect(); }} aria-disabled={isDisabled}
        onKeyDown={(event) => {
          if (!isDisabled && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(); }
        }} aria-label={`Выбрать игрока ${player.nickname}`} aria-pressed={isSelected}>
        <strong>{player.nickname}</strong>
        <span>Тир: {player.tier ?? "не задан"} · Роли: {player.positions || "не указаны"}</span>
      </div>
      <FiMove className="cup-player-grip" aria-hidden="true" />
      <button className="cup-player-remove" type="button" aria-label={`Убрать из конструктора: ${player.nickname}`}
        title="Убрать из конструктора" disabled={isDisabled} onClick={onRemove}><FiX aria-hidden="true" /></button>
    </article>
  );
}
