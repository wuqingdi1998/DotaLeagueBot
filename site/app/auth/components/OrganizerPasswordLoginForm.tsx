"use client";

import { useState, type FormEvent } from "react";
import { OrganizerPasswordField } from "@/app/components/OrganizerPasswordField";
import { fetchSiteRequest } from "@/lib/site-request";

export function OrganizerPasswordLoginForm({
  returnTo,
  autoFocus = false,
}: {
  returnTo: string;
  autoFocus?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const response = await fetchSiteRequest("/api/auth/organizer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Не удалось войти как организатор");
        return;
      }
      setPassword("");
      window.location.assign(returnTo);
    } catch {
      setError("Сервер недоступен. Проверьте соединение и попробуйте ещё раз");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="organizer-password-form" onSubmit={login}>
      <OrganizerPasswordField
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoFocus={autoFocus}
        disabled={isSaving}
      />
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={isSaving}>
        {isSaving ? "Проверяем…" : "Войти по паролю организатора"}
      </button>
    </form>
  );
}
