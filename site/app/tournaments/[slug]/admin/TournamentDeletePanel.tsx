"use client";

import { FormEvent, useState } from "react";
import { FiTrash2, FiX } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";

async function deleteTournament(tournamentId: number, password: string) {
  const response = await fetch("/api/admin/tournament-delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tournamentId, password }),
  });
  const responseText = await response.text();
  let body: { error?: string } | null = null;
  try {
    body = JSON.parse(responseText) as { error?: string };
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(
      body?.error || responseText || "Не удалось удалить турнир",
    );
  }
}

export function TournamentDeletePanel() {
  const { data } = useTournament();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  if (!data) return null;
  const tournament = data.tournament;

  function closeDialog() {
    if (isDeleting) return;
    setIsOpen(false);
    setPassword("");
    setError("");
  }

  async function confirmDelete(event: FormEvent) {
    event.preventDefault();
    setIsDeleting(true);
    setError("");
    try {
      await deleteTournament(tournament.id, password);
      window.location.assign("/tournaments");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось удалить турнир",
      );
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="tournament-delete-panel">
        <div>
          <p className="card-kicker">Опасное действие</p>
          <h3>Удалить турнир</h3>
          <p>
            Турнир, его команды, матчи, расписание и результаты будут удалены
            без возможности восстановления.
          </p>
        </div>
        <button
          className="tournament-delete-button"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          <FiTrash2 aria-hidden="true" />
          Удалить турнир
        </button>
      </section>

      {isOpen && (
        <div
          className="modal-backdrop tournament-delete-backdrop"
          role="presentation"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeDialog();
          }}
        >
          <section
            className="modal tournament-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tournament-delete-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeDialog}
              aria-label="Закрыть"
              disabled={isDeleting}
            >
              <FiX aria-hidden="true" />
            </button>
            <FiTrash2 className="tournament-delete-dialog-icon" aria-hidden="true" />
            <p className="card-kicker">Безвозвратное удаление</p>
            <h2 id="tournament-delete-title">Удалить {tournament.name}?</h2>
            <p className="tournament-delete-warning">
              Отменить это действие будет невозможно. Для подтверждения введите
              пароль организатора.
            </p>
            <form onSubmit={confirmDelete}>
              <label>
                <span>Пароль организатора</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                  disabled={isDeleting}
                />
              </label>
              {error && (
                <p className="tournament-delete-error" role="alert">
                  {error}
                </p>
              )}
              <div className="tournament-delete-dialog-actions">
                <button
                  className="tournament-delete-confirm"
                  type="submit"
                  disabled={isDeleting}
                >
                  <FiTrash2 aria-hidden="true" />
                  {isDeleting ? "Удаляем…" : "Удалить безвозвратно"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeDialog}
                  disabled={isDeleting}
                >
                  Отмена
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
