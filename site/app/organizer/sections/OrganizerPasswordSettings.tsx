"use client";

import { useState, type FormEvent } from "react";
import { OrganizerPasswordField } from "@/app/components/OrganizerPasswordField";
import { fetchSiteRequest } from "@/lib/site-request";

export function OrganizerPasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("Новый пароль и подтверждение не совпадают");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetchSiteRequest("/api/auth/organizer/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Не удалось изменить пароль");
        return;
      }
      window.location.assign(
        "/login?returnTo=%2Forganizer&passwordChanged=1",
      );
    } catch {
      setError("Сервер недоступен. Проверьте соединение и попробуйте ещё раз");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="organizer-password-settings" id="password-settings">
      <div>
        <p>Безопасность</p>
        <h2>Сменить пароль организатора</h2>
        <span>
          После смены все открытые входы по старому паролю завершатся.
        </span>
      </div>
      <form onSubmit={changePassword}>
        <OrganizerPasswordField
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          label="Текущий пароль"
          disabled={isSaving}
        />
        <OrganizerPasswordField
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          label="Новый пароль — не менее 12 символов"
          autoComplete="new-password"
          disabled={isSaving}
        />
        <OrganizerPasswordField
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          label="Повторите новый пароль"
          autoComplete="new-password"
          disabled={isSaving}
        />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? "Сохраняем…" : "Сменить пароль"}
        </button>
      </form>
    </section>
  );
}
