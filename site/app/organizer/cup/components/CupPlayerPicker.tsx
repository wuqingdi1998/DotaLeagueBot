import { useState } from "react";
import type { CupPlayer } from "../model/cup-board";

export function CupPlayerPicker({ players, isDisabled, onAdd }: {
  players: CupPlayer[]; isDisabled: boolean; onAdd: (playerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const matches = players.filter((player) => `${player.nickname} ${player.id}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return (
    <details className="cup-player-picker">
      <summary>Добавить участника</summary>
      <label>Никнейм или Discord ID
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти игрока" disabled={isDisabled} />
      </label>
      <p>Можно добавить любого зарегистрированного игрока, даже без матчей в лиге.</p>
      <div className="cup-picker-results">
        {matches.map((player) => <button type="button" key={player.id} disabled={isDisabled} onClick={() => onAdd(player.id)}>
          <strong>{player.nickname}</strong>
          <span>Тир: {player.tier ?? "не задан"} · Роли: {player.positions || "не указаны"} · Матчей: {player.matchCount}</span>
          <b aria-hidden="true">+</b>
        </button>)}
        {!matches.length && <p>Подходящих игроков нет.</p>}
      </div>
    </details>
  );
}
