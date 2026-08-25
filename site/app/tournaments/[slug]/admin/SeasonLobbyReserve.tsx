"use client";

import { useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { FiArrowDown } from "react-icons/fi";
import { sortSeasonRegistrations } from "../model/season-registration";
import type { SeasonRoundRegistration } from "../model/season-types";

export function SeasonLobbyReserve({
  busy,
  isEditing,
  onSelect,
  registrations,
  selectedPlayerId,
}: {
  busy: boolean;
  isEditing: boolean;
  onSelect: (playerId: string) => void;
  registrations: SeasonRoundRegistration[];
  selectedPlayerId: string | null;
}) {
  const [playerOrder, setPlayerOrder] = useState<"registration" | "tier">(
    "registration",
  );
  const orderedRegistrations = useMemo(
    () =>
      playerOrder === "tier"
        ? sortSeasonRegistrations(registrations, "tier", "descending")
        : registrations,
    [playerOrder, registrations],
  );
  const longestNicknameLength = Math.max(
    10,
    ...registrations.map(({ nickname }) => Array.from(nickname).length),
  );
  const playerPoolStyle = {
    "--season-builder-nickname-width": `${Math.min(
      28,
      longestNicknameLength + 2,
    )}ch`,
  } as CSSProperties;

  return (
    <section className="season-builder-reserve">
      <header className="season-builder-pool-heading">
        <div className="season-builder-pool-title">
          <strong>Запас</strong>
          <small>
            Игроки из неполной десятки и участники без места в лобби.
          </small>
        </div>
        <div className="season-builder-pool-sorts">
          <button
            className={playerOrder === "registration" ? "active" : ""}
            type="button"
            onClick={() => setPlayerOrder("registration")}
          >
            По регистрации
          </button>
          <button
            className={playerOrder === "tier" ? "active" : ""}
            type="button"
            onClick={() => setPlayerOrder("tier")}
          >
            Тир <FiArrowDown aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="season-builder-player-pool" style={playerPoolStyle}>
        {orderedRegistrations.map((registration) => {
          const isSelected = registration.player_id === selectedPlayerId;
          return (
            <button
              className={`season-builder-player${isSelected ? " selected" : ""}`}
              type="button"
              draggable={isEditing}
              disabled={!isEditing || busy}
              key={registration.player_id}
              aria-label={`${registration.nickname}, тир ${registration.tier_snapshot ?? "—"}, роли ${registration.positions ?? "—"}`}
              onClick={() => onSelect(registration.player_id)}
              onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                event.dataTransfer.setData("text/plain", registration.player_id);
                onSelect(registration.player_id);
              }}
            >
              <span className="season-builder-player-name">
                <strong>{registration.nickname}</strong>
              </span>
              <span className="season-builder-player-tier season-builder-tier-badge">
                <strong>{registration.tier_snapshot ?? "—"}</strong>
              </span>
              <span className="season-builder-player-roles">
                <strong>{registration.positions ?? "—"}</strong>
              </span>
            </button>
          );
        })}
        {!orderedRegistrations.length && (
          <p className="season-builder-pool-empty">
            Запас пуст — все игроки распределены по полным лобби.
          </p>
        )}
      </div>
    </section>
  );
}
