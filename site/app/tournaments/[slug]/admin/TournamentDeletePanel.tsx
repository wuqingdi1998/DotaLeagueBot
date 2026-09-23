"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import { FormEvent, useState } from "react";
import { FiTrash2, FiX } from "react-icons/fi";
import { OrganizerPasswordField } from "@/app/components/OrganizerPasswordField";
import { useTournament } from "../hooks/TournamentContext";

async function deleteTournament(
  tournamentId: number,
  password: string,
  requiresPasswordConfirmation: boolean,
) {
  const response = await fetchSiteRequest("/api/admin/tournament-delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tournamentId,
      password,
      confirmed: !requiresPasswordConfirmation,
    }),
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
  const isCloseTournament = Boolean(tournament.close_event_id);
  const requiresPasswordConfirmation =
    data.user?.organizerAccess === "password";

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
      await deleteTournament(
        tournament.id,
        password,
        requiresPasswordConfirmation,
      );
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
            {isCloseTournament
              ? "Турнир клоза, его составы, матч и результат будут удалены без возможности восстановления. Анонс в Discord останется."
              : "Турнир, его команды, матчи, расписание и результаты будут удалены без возможности восстановления."}
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
              {requiresPasswordConfirmation
                ? "Отменить это действие будет невозможно. Для подтверждения введите пароль организатора."
                : "Отменить это действие будет невозможно. Подтвердите удаление кнопкой ниже."}
              {isCloseTournament && " Анонс клоза в Discord удалён не будет."}
            </p>
            <form onSubmit={confirmDelete}>
              {requiresPasswordConfirmation && (
                <OrganizerPasswordField
                  autoFocus
                  disabled={isDeleting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
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
