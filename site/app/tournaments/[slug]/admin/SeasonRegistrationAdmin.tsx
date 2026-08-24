"use client";

import { FormEvent, useState } from "react";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import type {
  SeasonRound,
  SeasonRoundRegistration,
} from "../model/season-types";
import {
  SeasonAdminPlayerPicker,
  type SeasonAdminPlayerOption,
} from "./SeasonAdminPlayerPicker";

export function SeasonRegistrationAdmin({ round }: { round: SeasonRound }) {
  const { season } = useTournament();
  const [selectedPlayer, setSelectedPlayer] =
    useState<SeasonAdminPlayerOption | null>(null);
  const [tierSnapshot, setTierSnapshot] = useState("");
  const [removalTarget, setRemovalTarget] =
    useState<SeasonRoundRegistration | null>(null);
  const [password, setPassword] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pickerRevision, setPickerRevision] = useState(0);
  if (!season.data?.isOrganizer) return null;

  function selectPlayer(player: SeasonAdminPlayerOption | null) {
    setSelectedPlayer(player);
    setTierSnapshot(player?.tier ? String(player.tier) : "");
  }

  async function addRegistration(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlayer || isSaving) return;
    setIsSaving(true);
    try {
      const result = await season.mutate(
        "POST",
        {
          entity: "registration",
          roundId: round.id,
          playerId: selectedPlayer.discord_id,
          tierSnapshot,
        },
        `${selectedPlayer.nickname} добавлен в регистрацию`,
      );
      if (result.ok) {
        selectPlayer(null);
        setPickerRevision((current) => current + 1);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function removeRegistration(event: FormEvent) {
    event.preventDefault();
    if (!removalTarget || isSaving) return;
    setIsSaving(true);
    setRemovalError("");
    try {
      const result = await season.mutate(
        "DELETE",
        {
          entity: "registration",
          roundId: round.id,
          playerId: removalTarget.player_id,
          password,
        },
        `${removalTarget.nickname} удалён из регистрации`,
      );
      if (result.ok) resetRemoval();
      else setRemovalError(result.error ?? "Не удалось удалить регистрацию");
    } finally {
      setIsSaving(false);
    }
  }

  function closeRemoval() {
    if (isSaving) return;
    resetRemoval();
  }

  function resetRemoval() {
    setRemovalTarget(null);
    setPassword("");
    setRemovalError("");
  }

  return (
    <details className="season-registration-admin">
      <summary>Управление регистрацией</summary>
      <form onSubmit={addRegistration}>
        <SeasonAdminPlayerPicker
          key={pickerRevision}
          label="Добавить участника вручную"
          onSelect={selectPlayer}
        />
        <label>
          <span>Тир на этот тур</span>
          <input
            type="number"
            min="1"
            max="12"
            required
            value={tierSnapshot}
            onChange={(event) => setTierSnapshot(event.target.value)}
          />
        </label>
        <button
          className="secondary-button"
          type="submit"
          disabled={!selectedPlayer || isSaving}
        >
          <FiPlus aria-hidden="true" /> Добавить
        </button>
      </form>
      <ul>
        {round.registrations.map((registration) => (
          <li key={registration.player_id}>
            <span>
              <strong>{registration.nickname}</strong>
              <small>
                тир {registration.tier_snapshot ?? "—"}
                {registration.is_checked_in ? " · чек-ин пройден" : ""}
              </small>
            </span>
            <button
              className="danger-button"
              type="button"
              aria-label={`Удалить ${registration.nickname} из регистрации`}
              onClick={() => setRemovalTarget(registration)}
            >
              <FiTrash2 aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {removalTarget && (
        <div className="modal-backdrop season-registration-remove-backdrop">
          <section
            className="modal season-registration-remove-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="season-registration-remove-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeRemoval}
              disabled={isSaving}
              aria-label="Закрыть"
            >
              <FiX aria-hidden="true" />
            </button>
            <h3 id="season-registration-remove-title">
              Удалить {removalTarget.nickname} из регистрации?
            </h3>
            <p>
              Игрок исчезнет из списка регистрации и потеряет пройденный
              чек-ин. Уже опубликованный состав лобби автоматически не изменится.
            </p>
            <form onSubmit={removeRegistration}>
              <label>
                <span>Пароль организатора</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {removalError && (
                <p className="season-registration-remove-error" role="alert">
                  {removalError}
                </p>
              )}
              <div>
                <button
                  className="danger-button"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Проверяем…" : "Удалить"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeRemoval}
                  disabled={isSaving}
                >
                  Отмена
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </details>
  );
}
