"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FiTrash2, FiX } from "react-icons/fi";
import type { ParticipantDirectoryPlayer } from "@/lib/participants";

async function playerAdminRequest(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
      body?.error || responseText || "Не удалось сохранить изменения",
    );
  }
}

export function ParticipantAdminDialog({
  player,
  canArchive,
  onClose,
}: {
  player: ParticipantDirectoryPlayer;
  canArchive: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(String(player.tier ?? 0));
  const [deleteStep, setDeleteStep] = useState<"none" | "question" | "password">(
    "none",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitTier(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await playerAdminRequest({
        action: "update-tier",
        playerId: player.discordId,
        tier: Number(tier),
      });
      router.refresh();
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось изменить тир",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmArchive(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await playerAdminRequest({
        action: "archive",
        playerId: player.discordId,
        password,
      });
      router.refresh();
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось перенести участника в архив",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="participant-admin-backdrop" role="presentation">
      <section
        className="participant-admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="participant-admin-title"
      >
        <header>
          <div>
            <span>Управление участником</span>
            <h2 id="participant-admin-title">{player.nickname}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <FiX aria-hidden="true" />
          </button>
        </header>

        {deleteStep === "none" && (
          <form className="participant-tier-form" onSubmit={submitTier}>
            <label>
              <span>Изменить тир</span>
              <input
                type="number"
                min={0}
                max={12}
                value={tier}
                onChange={(event) => setTier(event.target.value)}
                required
              />
              <small>Тиры от 1 до 12. Значение 0 возвращает автоматический тир.</small>
            </label>
            <div>
              <button type="submit" disabled={isSaving}>
                {isSaving ? "Сохраняем…" : "Сохранить"}
              </button>
              {canArchive && (
                <button
                  className="participant-delete-button"
                  type="button"
                  onClick={() => setDeleteStep("question")}
                  aria-label="Удалить из базы"
                  title="Удалить из базы"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        )}

        {deleteStep === "question" && (
          <div className="participant-delete-confirm">
            <h3>Удалить из базы?</h3>
            <p>
              Участник станет архивным. Его старые матчи, результаты и медали
              сохранятся.
            </p>
            <div>
              <button
                className="danger"
                type="button"
                onClick={() => setDeleteStep("password")}
              >
                Да
              </button>
              <button type="button" onClick={() => setDeleteStep("none")}>
                Нет
              </button>
            </div>
          </div>
        )}

        {deleteStep === "password" && (
          <form className="participant-delete-confirm" onSubmit={confirmArchive}>
            <h3>Подтвердите действие</h3>
            <label>
              <span>Пароль организатора</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <div>
              <button className="danger" type="submit" disabled={isSaving}>
                {isSaving ? "Проверяем…" : "Перенести в архив"}
              </button>
              <button type="button" onClick={() => setDeleteStep("question")}>
                Назад
              </button>
            </div>
          </form>
        )}
        {error && <p className="participant-admin-error">{error}</p>}
      </section>
    </div>
  );
}
