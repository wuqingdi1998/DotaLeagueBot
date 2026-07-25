"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { FaDiscord } from "react-icons/fa";
import { OrganizerAccess } from "../tournaments/OrganizerAccess";

type SessionUser = {
  discordId: string;
  username: string;
  playerName: string;
  isAdmin: boolean;
};

const initialTournament = {
  slug: "ls-community-cup",
  name: "LS Community Cup",
  eyebrow: "Первый турнир сезона · Pre-made",
  headline: "Соберите команду.",
  headline_accent: "Войдите в историю.",
  description:
    "Первый командный турнир Linken's Sphere Esports: групповой этап, плей-офф и три вечера хорошей «Доты».",
  about:
    "Капитан собирает состав из пяти зарегистрированных игроков и отправляет заявку. После подтверждения команда попадает в одну из двух групп.",
  start_at: "2026-08-07T18:00",
  end_at: "2026-08-09T23:00",
  registration_deadline: "2026-08-05T23:59",
  status_label: "Регистрация открыта",
  format: "Pre-made · 5 × 5",
  team_size: 5,
  max_teams: 8,
  region: "EU / RU",
  server: "EU West",
  check_in_minutes: 60,
  group_format: "Групповой этап · 2 группы · BO1",
  playoff_format: "Плей-офф · верхняя и нижняя сетка · BO3",
  final_format: "Гранд-финал · BO5",
  discord_url: "https://discord.gg/lsesports",
  status: "registration",
};

const labels: Record<string, string> = {
  slug: "Адрес турнира латиницей",
  name: "Название",
  eyebrow: "Строка над заголовком",
  headline: "Главный заголовок",
  headline_accent: "Голубая часть заголовка",
  description: "Краткое описание",
  about: "Полное описание",
  status_label: "Видимый статус",
  format: "Формат",
  region: "Регион",
  server: "Игровой сервер",
  group_format: "Групповой этап",
  playoff_format: "Плей-офф",
  final_format: "Гранд-финал",
  discord_url: "Ссылка Discord",
};

export default function SetupPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(initialTournament);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { user: SessionUser | null }) => setUser(result.user))
      .finally(() => setLoaded(true));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/tournament", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        registration_deadline: new Date(
          form.registration_deadline,
        ).toISOString(),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Не удалось создать турнир");
      return;
    }
    window.location.assign("/");
  }

  if (!loaded) {
    return (
      <main className="loading-screen" data-theme="dark">
        <Image
          src="/linkens-sphere-logo.png"
          alt=""
          width={74}
          height={74}
          priority
          unoptimized
        />
        <span>Проверяем доступ</span>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="setup-screen" data-theme="dark">
        <Image
          src="/linkens-sphere-logo.png"
          alt="Linken's Sphere"
          width={86}
          height={86}
          priority
          unoptimized
        />
        <h1>Первичная настройка сайта</h1>
        <p>
          Сначала войдите как зарегистрированный участник через Discord. Затем
          сайт отдельно попросит пароль организатора.
        </p>
        <a className="discord-login" href="/api/auth/discord?returnTo=%2Fsetup">
          <FaDiscord /> Вход через Discord
        </a>
      </main>
    );
  }

  if (!user.isAdmin) {
    return (
      <main className="setup-screen" data-theme="dark">
        <h1>Включите режим организатора</h1>
        <p>
          Вы вошли как обычный участник. Для первоначальной настройки сайта
          введите отдельный пароль организатора.
        </p>
        <OrganizerAccess user={user} manageHref="/setup" />
      </main>
    );
  }

  return (
    <main className="setup-screen setup-form-screen" data-theme="dark">
      <div className="setup-heading">
        <Image
          src="/linkens-sphere-logo.png"
          alt=""
          width={70}
          height={70}
          unoptimized
        />
        <div>
          <span>Первичная настройка</span>
          <h1>Создать первый турнир</h1>
          <p>
            Данные сохранятся в общей базе. После создания их можно менять в
            панели организатора.
          </p>
        </div>
      </div>
      <form className="tournament-editor setup-editor" onSubmit={submit}>
        <div className="editor-grid">
          {Object.keys(labels).map((key) => (
            <label
              className={["description", "about"].includes(key) ? "wide-field" : ""}
              key={key}
            >
              <span>{labels[key]}</span>
              {["description", "about"].includes(key) ? (
                <textarea
                  required
                  value={String(form[key as keyof typeof form])}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              ) : (
                <input
                  required
                  value={String(form[key as keyof typeof form])}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              )}
            </label>
          ))}
          {(["start_at", "end_at", "registration_deadline"] as const).map(
            (field) => (
              <label key={field}>
                <span>
                  {field === "start_at"
                    ? "Начало"
                    : field === "end_at"
                      ? "Окончание"
                      : "Дедлайн регистрации"}
                </span>
                <input
                  required
                  type="datetime-local"
                  value={form[field]}
                  onChange={(event) =>
                    setForm({ ...form, [field]: event.target.value })
                  }
                />
              </label>
            ),
          )}
          {(
            [
              ["team_size", "Игроков в команде"],
              ["max_teams", "Команд"],
              ["check_in_minutes", "Check-in, минут"],
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              <span>{label}</span>
              <input
                required
                type="number"
                value={form[field]}
                onChange={(event) =>
                  setForm({ ...form, [field]: Number(event.target.value) })
                }
              />
            </label>
          ))}
        </div>
        {error && <p className="field-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Создаём…" : "Создать турнир"}
        </button>
      </form>
    </main>
  );
}
