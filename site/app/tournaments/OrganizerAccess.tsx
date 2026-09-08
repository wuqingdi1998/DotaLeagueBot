"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import { FormEvent, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { FaDiscord } from "react-icons/fa";
import { FiEye, FiEyeOff, FiLogOut, FiShield, FiX } from "react-icons/fi";

const SiteBreakButton = dynamic(
  () => import("./SiteBreakButton").then((module) => module.SiteBreakButton),
  { ssr: false },
);

type OrganizerUser = {
  isAdmin: boolean;
} | null;

export function OrganizerAccess({
  user,
  manageHref = "/tournaments",
}: {
  user: OrganizerUser;
  manageHref?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetchSiteRequest("/api/auth/organizer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Не удалось включить режим организатора");
        return;
      }
      setPassword("");
      window.location.assign(manageHref);
    } catch {
      setError("Сервер недоступен. Проверьте соединение и попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    setSaving(true);
    setError("");
    try {
      const response = await fetchSiteRequest("/api/auth/organizer", {
        method: "DELETE",
      });
      if (response.ok) {
        window.location.reload();
      } else {
        setError("Не удалось выйти из режима организатора");
      }
    } catch {
      setError("Сервер недоступен. Проверьте соединение и попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="organizer-controls">
        <button
          className="organizer-entry"
          type="button"
          onClick={() => setOpen(true)}
        >
          <FiShield aria-hidden="true" />
          {user?.isAdmin ? "Организатор · активен" : "Режим организатора"}
        </button>
        {user?.isAdmin && <SiteBreakButton />}
      </div>

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            className="modal organizer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="organizer-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
            >
              <FiX />
            </button>
            <div className="organizer-modal-icon">
              <FiShield />
            </div>

            {!user ? (
              <>
                <h2 id="organizer-title">Сначала войдите через Discord</h2>
                <p className="modal-intro">
                  Режим организатора включается для зарегистрированного
                  участника. Это позволяет сохранять автора каждого изменения.
                </p>
                <a
                  className="discord-login modal-discord-button"
                  href={`/api/auth/discord?returnTo=${encodeURIComponent(pathname)}`}
                >
                  <FaDiscord /> Войти через Discord
                </a>
              </>
            ) : user.isAdmin ? (
              <>
                <h2 id="organizer-title">Режим организатора активен</h2>
                <p className="modal-intro">
                  Управление турнирами открыто на 12 часов. Профиль участника
                  при этом остаётся обычным Discord-профилем.
                </p>
                <div className="organizer-modal-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => window.location.assign(manageHref)}
                  >
                    Открыть управление
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void deactivate()}
                    disabled={saving}
                  >
                    <FiLogOut /> Выйти из режима
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="organizer-title">Режим организатора</h2>
                <p className="modal-intro">
                  Discord-вход даёт права обычного участника. Для управления
                  турнирами введите отдельный пароль организатора.
                </p>
                <form className="organizer-password-form" onSubmit={activate}>
                  <div className="organizer-password-field">
                    <label>
                      <span>Пароль организатора</span>
                      <input
                        required
                        minLength={12}
                        type={isPasswordVisible ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                    <button
                      className="organizer-password-visibility"
                      type="button"
                      aria-label={
                        isPasswordVisible ? "Скрыть пароль" : "Показать пароль"
                      }
                      aria-pressed={isPasswordVisible}
                      onClick={() => setIsPasswordVisible((visible) => !visible)}
                    >
                      {isPasswordVisible ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {error && <p className="field-error">{error}</p>}
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Проверяем…" : "Открыть управление"}
                  </button>
                </form>
              </>
            )}
            {user?.isAdmin && error && <p className="field-error">{error}</p>}
          </section>
        </div>
      )}
    </>
  );
}
