"use client";

import { useState, type DragEvent } from "react";
import { CupPlayerCard } from "../components/CupPlayerCard";
import { CupPlayerPicker } from "../components/CupPlayerPicker";
import { useCupConstructor } from "../hooks/useCupConstructor";
import {
  CUP_MINIMUM_MATCHES, CUP_SCORING_SLOT_COUNT, cupBasketTierTotal, cupBoardPlayerIds,
  moveCupPlayer, removeCupPlayer, toggleCupReadiness, type CupDestination,
} from "../model/cup-board";

export function CupConstructor() {
  const cup = useCupConstructor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isDisabled = cup.saveStatus === "error" || cup.saveStatus === "loading";
  const snapshot = cup.snapshot;
  const players = new Map(snapshot?.players.map((player) => [player.id, player]));
  const includedIds = new Set(snapshot ? cupBoardPlayerIds(snapshot.board) : []);

  function move(playerId: string, destination: CupDestination) {
    if (isDisabled) return;
    cup.changeBoard((board) => moveCupPlayer(board, playerId, destination));
    setSelectedId(null);
  }

  function drop(event: DragEvent, destination: CupDestination) {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain");
    if (includedIds.has(id)) move(id, destination);
  }

  function card(id: string) {
    const player = players.get(id) ?? { id, nickname: `Игрок ${id}`, tier: null, positions: null, matchCount: 0 };
    return <CupPlayerCard player={player} isReady={Boolean(snapshot?.board.readyPlayerIds.includes(id))}
      isSelected={selectedId === id} isDisabled={isDisabled}
      onSelect={() => setSelectedId(selectedId === id ? null : id)}
      onToggleReady={() => cup.changeBoard((board) => toggleCupReadiness(board, id))}
      onRemove={() => { cup.changeBoard((board) => removeCupPlayer(board, id)); if (selectedId === id) setSelectedId(null); }} />;
  }

  return (
    <section className="cup-constructor">
      <header className="cup-constructor-heading">
        <div><p>Инструменты организатора</p><h1>Конструктор кубка</h1></div>
        <span className={`cup-save-status is-${cup.saveStatus}`} role="status">
          {cup.saveStatus === "saved" ? "Все изменения сохранены" : cup.saveStatus === "saving" ? "Сохраняем…"
            : cup.saveStatus === "loading" ? "Загружаем…" : "Изменения не сохранены"}
        </span>
      </header>
      {cup.error && <div className="cup-save-error" role="alert"><p>{cup.error}</p>
        <button type="button" onClick={() => void (cup.hasConflict || !snapshot ? cup.reload() : cup.retry())}>
          {cup.hasConflict ? "Загрузить сохранённую версию" : "Повторить"}
        </button>
      </div>}
      {snapshot && <>
        <p className="cup-instructions">Перетащите игрока в нужный слот или нажмите на его плашку и выберите место.
          Нажатие на кружок подтверждает или отменяет готовность.</p>
        {selectedId && <div className="cup-selection" role="status">
          Выбран: <strong>{players.get(selectedId)?.nickname ?? selectedId}</strong>. Укажите слот или место в списке.
          <button type="button" onClick={() => setSelectedId(null)}>Отменить выбор</button>
        </div>}
        <section className="cup-pool-section" aria-labelledby="cup-pool-heading">
          <header><div><h2 id="cup-pool-heading">Список игроков <span>{snapshot.board.pool.length}</span></h2>
            <p>Первоначально: от {CUP_MINIMUM_MATCHES} матчей · {snapshot.leagueName ?? "Лига пока не создана"}</p></div>
            <span>Готовы: {snapshot.board.readyPlayerIds.length} / {includedIds.size}</span></header>
          <CupPlayerPicker players={snapshot.players.filter((player) => !includedIds.has(player.id))} isDisabled={isDisabled}
            onAdd={(id) => cup.changeBoard((board) => cupBoardPlayerIds(board).includes(id) ? board : { ...board, pool: [...board.pool, id] })} />
          <div className="cup-player-pool" onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => drop(event, { poolIndex: snapshot.board.pool.length })}>
            {snapshot.board.pool.map((id, index) => <div className="cup-pool-item" key={id}
              onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, { poolIndex: index })}>
              {selectedId && selectedId !== id && <button className="cup-insert" type="button" disabled={isDisabled}
                onClick={() => move(selectedId, { poolIndex: index })}>Поставить перед {players.get(id)?.nickname ?? id}</button>}
              {card(id)}
            </div>)}
            {!snapshot.board.pool.length && <p className="cup-empty-pool">Список пуст. Добавьте участника или верните игрока из корзины.</p>}
          </div>
          {selectedId && <button className="cup-return" type="button" disabled={isDisabled}
            onClick={() => move(selectedId, { poolIndex: snapshot.board.pool.length })}>Переместить в конец списка</button>}
        </section>
        <div className="cup-baskets">
          {snapshot.board.baskets.map((basket, basketIndex) => {
            const tiers = cupBasketTierTotal(basket, players);
            return <section className="cup-basket" key={basketIndex} aria-labelledby={`cup-basket-${basketIndex}`}>
              <header><h2 id={`cup-basket-${basketIndex}`}>Корзина {basketIndex + 1}</h2>
                <p>Сумма тиров первых пяти слотов: <strong data-tier-total={basketIndex}>{tiers.total}</strong></p>
                {tiers.unknown > 0 && <small>Тир не задан у {tiers.unknown} игроков – сумма неполная</small>}</header>
              <ol>{basket.map((id, slot) => <li key={slot} className={`cup-slot${slot >= CUP_SCORING_SLOT_COUNT ? " is-coach" : ""}`}
                data-basket={basketIndex} data-slot={slot}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                onDrop={(event) => drop(event, { basket: basketIndex, slot })}>
                <div className="cup-slot-label">Слот {slot + 1}{slot >= CUP_SCORING_SLOT_COUNT ? " · Тренер · не входит в сумму" : ""}</div>
                {id ? card(id) : <button className="cup-empty-slot" type="button" disabled={isDisabled} aria-disabled={!selectedId || isDisabled}
                  aria-label={`Корзина ${basketIndex + 1}, слот ${slot + 1}: поставить игрока`}
                  onClick={() => selectedId && move(selectedId, { basket: basketIndex, slot })}>
                  {selectedId ? "Поставить сюда" : "Перетащите игрока"}</button>}
                {id && selectedId && id !== selectedId && <button type="button" className="cup-slot-swap" disabled={isDisabled}
                  onClick={() => move(selectedId, { basket: basketIndex, slot })}>Поменять местами</button>}
              </li>)}</ol>
            </section>;
          })}
        </div>
      </>}
    </section>
  );
}
