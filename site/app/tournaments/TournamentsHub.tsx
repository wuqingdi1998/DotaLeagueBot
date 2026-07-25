"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaDiscord } from "react-icons/fa";
import {
  FiArchive,
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiMoon,
  FiPlus,
  FiSun,
  FiUsers,
  FiX,
} from "react-icons/fi";
import {
  isPastTournament,
  isUpcomingTournament,
  type TournamentStatus,
} from "@/lib/tournaments";
import { OrganizerAccess } from "./OrganizerAccess";

type TournamentSummary = {
  id: number;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  status_label: string;
  format: string;
  team_size: number;
  max_teams: number;
  region: string;
  status: TournamentStatus;
  team_count: number;
  match_count: number;
  finished_match_count: number;
};

export type SessionUser = {
  discordId: string;
  dotaId: string;
  username: string;
  avatarUrl: string | null;
  playerName: string;
  realName: string | null;
  positions: string | null;
  serverName: string;
  isAdmin: boolean;
};

type TournamentListResponse = {
  tournaments: TournamentSummary[];
  user: SessionUser | null;
};

type NewTournament = {
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  headline_accent: string;
  description: string;
  about: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  status_label: string;
  format: string;
  team_size: number;
  max_teams: number;
  region: string;
  server: string;
  check_in_minutes: number;
  group_format: string;
  playoff_format: string;
  final_format: string;
  discord_url: string;
  status: TournamentStatus;
};

const emptyTournament: NewTournament = {
  slug: "",
  name: "",
  eyebrow: "",
  headline: "",
  headline_accent: "",
  description: "",
  about: "",
  start_at: "",
  end_at: "",
  registration_deadline: "",
  status_label: "",
  format: "",
  team_size: 5,
  max_teams: 8,
  region: "EU / RU",
  server: "EU West",
  check_in_minutes: 60,
  group_format: "",
  playoff_format: "",
  final_format: "",
  discord_url: "https://discord.gg/lsesports",
  status: "draft",
};

const statusDetails: Record<
  TournamentStatus,
  { label: string; short: string }
> = {
  draft: { label: "Черновик", short: "Черновик организатора" },
  registration: { label: "Регистрация", short: "Регистрация открыта" },
  active: { label: "Идёт сейчас", short: "Турнир идёт" },
  finished: { label: "Завершён", short: "Результаты опубликованы" },
  archived: { label: "Архив", short: "Архивный турнир" },
};

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (startDate.getFullYear() === endDate.getFullYear()) {
    const shortStart = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
    }).format(startDate);
    return `${shortStart} — ${formatter.format(endDate)}`;
  }
  return `${formatter.format(startDate)} — ${formatter.format(endDate)}`;
}

function toIso(value: string) {
  return value ? `${value}:00+03:00` : value;
}

function loadSavedTheme() {
  if (typeof window === "undefined") return "dark" as const;
  return window.localStorage.getItem("ls-theme") === "light"
    ? ("light" as const)
    : ("dark" as const);
}

function SiteHeader({
  theme,
  setTheme,
  user,
}: {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  function switchTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("ls-theme", next);
  }

  return (
    <header className="site-header platform-header">
      <Link className="brand" href="/" aria-label="Linken's Sphere Esports">
        <Image
          src="/linkens-sphere-logo.png"
          alt="Логотип Linken's Sphere Esports"
          width={48}
          height={48}
          priority
          unoptimized
        />
        <span>
          <strong>Linken&apos;s Sphere</strong>
          <small>Esports community</small>
        </span>
      </Link>

      <nav className="platform-navigation" aria-label="Основная навигация">
        <Link
          className={pathname === "/" ? "active" : undefined}
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          Главная
        </Link>
        <Link
          className={pathname.startsWith("/tournaments") ? "active" : undefined}
          href="/tournaments"
          aria-current={
            pathname.startsWith("/tournaments") ? "page" : undefined
          }
        >
          Турниры
        </Link>
        <a
          href="https://discord.gg/lsesports"
          target="_blank"
          rel="noreferrer"
        >
          Наш Discord <FiArrowUpRight aria-hidden="true" />
        </a>
      </nav>

      <div className="header-actions">
        <button
          className="theme-button"
          onClick={switchTheme}
          aria-label={
            theme === "light"
              ? "Включить тёмную тему"
              : "Включить светлую тему"
          }
        >
          {theme === "light" ? <FiMoon /> : <FiSun />}
        </button>
        {user ? (
          <div className="player-profile-control">
            <button
              className="player-profile-button"
              onClick={() => setProfileOpen((current) => !current)}
              aria-expanded={profileOpen}
            >
              {user.avatarUrl ? (
                <Image
                  className="player-profile-avatar"
                  src={user.avatarUrl}
                  alt=""
                  width={38}
                  height={38}
                  unoptimized
                />
              ) : (
                <span className="player-profile-avatar fallback">
                  {user.playerName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="player-profile-copy">
                <strong>{user.serverName}</strong>
                <small>Профиль участника</small>
              </span>
            </button>
            {profileOpen && (
              <div className="player-profile-popover">
                <strong>{user.serverName}</strong>
                <span>Discord: {user.username}</span>
                <Link
                  className="profile-popover-link"
                  href={`/players/${user.dotaId}`}
                  onClick={() => setProfileOpen(false)}
                >
                  Открыть страницу игрока <FiArrowRight aria-hidden="true" />
                </Link>
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.reload();
                  }}
                >
                  Выйти из профиля
                </button>
              </div>
            )}
          </div>
        ) : (
          <a
            className="discord-login"
            href={`/api/auth/discord?returnTo=${encodeURIComponent(pathname)}`}
          >
            <FaDiscord aria-hidden="true" />
            <span>Вход через Discord</span>
          </a>
        )}
      </div>
    </header>
  );
}

function TournamentCard({
  tournament,
  isAdmin,
  onStatusChange,
}: {
  tournament: TournamentSummary;
  isAdmin: boolean;
  onStatusChange: (id: number, status: TournamentStatus) => Promise<void>;
}) {
  const isPast = isPastTournament(tournament.status);
  return (
    <article className={`tournament-card status-${tournament.status}`}>
      <div className="tournament-card-top">
        <span className={`tournament-status ${tournament.status}`}>
          {tournament.status === "active" && <i />}
          {statusDetails[tournament.status].label}
        </span>
        <span>{tournament.region}</span>
      </div>
      <p className="card-kicker">{tournament.eyebrow || "Турнир сообщества"}</p>
      <h2>{tournament.name}</h2>
      <p className="tournament-card-description">{tournament.description}</p>
      <div className="tournament-card-date">
        <FiCalendar aria-hidden="true" />
        <strong>{formatDateRange(tournament.start_at, tournament.end_at)}</strong>
      </div>
      <dl className="tournament-card-stats">
        <div>
          <dt>Формат</dt>
          <dd>{tournament.format}</dd>
        </div>
        <div>
          <dt>Команды</dt>
          <dd>
            {tournament.team_count}
            {!isPast && ` / ${tournament.max_teams}`}
          </dd>
        </div>
        <div>
          <dt>Результаты</dt>
          <dd>
            {tournament.finished_match_count} из {tournament.match_count} матчей
          </dd>
        </div>
      </dl>
      <div className="tournament-card-actions">
        <Link
          className="primary-button compact"
          href={`/tournaments/${tournament.slug}`}
        >
          {isPast ? "Результаты" : "Открыть турнир"} <FiArrowRight />
        </Link>
        {isAdmin && (
          <>
            <Link
              className="secondary-button compact"
              href={`/tournaments/${tournament.slug}?manage=1`}
            >
              <FiEdit3 /> Управление
            </Link>
            {tournament.status === "finished" && (
              <button
                className="text-action"
                onClick={() => void onStatusChange(tournament.id, "archived")}
              >
                <FiArchive /> В архив
              </button>
            )}
            {tournament.status === "archived" && (
              <button
                className="text-action"
                onClick={() => void onStatusChange(tournament.id, "finished")}
              >
                <FiCheckCircle /> Вернуть
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function TournamentForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const [form, setForm] = useState<NewTournament>(emptyTournament);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof NewTournament>(
    field: K,
    value: NewTournament[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const registrationDeadline = new Date(toIso(form.registration_deadline));
    const start = new Date(toIso(form.start_at));
    const end = new Date(toIso(form.end_at));
    if (
      !Number.isFinite(registrationDeadline.getTime()) ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      registrationDeadline > start ||
      start >= end
    ) {
      setError(
        "Дедлайн регистрации должен быть не позже начала, а окончание — позже начала турнира",
      );
      return;
    }
    setSaving(true);
    setError("");
    const response = await fetch("/api/tournament", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        start_at: toIso(form.start_at),
        end_at: toIso(form.end_at),
        registration_deadline: toIso(form.registration_deadline),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Не удалось создать турнир");
      return;
    }
    onCreated(form.slug);
  }

  const textFields: Array<{
    field: keyof NewTournament;
    label: string;
    placeholder?: string;
    wide?: boolean;
    multiline?: boolean;
  }> = [
    { field: "slug", label: "Адрес латиницей", placeholder: "summer-cup-2026" },
    { field: "name", label: "Название", placeholder: "Summer Community Cup" },
    {
      field: "eyebrow",
      label: "Короткая строка над заголовком",
      placeholder: "Летний турнир · Pre-made",
    },
    {
      field: "status_label",
      label: "Видимый статус",
      placeholder: "Регистрация открыта",
    },
    {
      field: "headline",
      label: "Главный заголовок",
      placeholder: "Соберите команду.",
    },
    {
      field: "headline_accent",
      label: "Выделенная часть заголовка",
      placeholder: "Войдите в историю.",
    },
    {
      field: "description",
      label: "Краткое описание",
      wide: true,
      multiline: true,
    },
    {
      field: "about",
      label: "Полное описание",
      wide: true,
      multiline: true,
    },
    { field: "format", label: "Формат", placeholder: "Pre-made · 5 × 5" },
    { field: "region", label: "Регион" },
    { field: "server", label: "Игровой сервер" },
    {
      field: "group_format",
      label: "Групповой этап",
      placeholder: "Групповой этап · 2 группы · BO1",
    },
    {
      field: "playoff_format",
      label: "Плей-офф",
      placeholder: "Плей-офф · верхняя и нижняя сетка · BO3",
    },
    {
      field: "final_format",
      label: "Финал",
      placeholder: "Гранд-финал · BO5",
    },
    { field: "discord_url", label: "Ссылка Discord" },
  ];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal tournament-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-tournament-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" aria-label="Закрыть" onClick={onClose}>
          <FiX />
        </button>
        <p className="card-kicker">Панель организатора</p>
        <h2 id="create-tournament-title">Добавить турнир</h2>
        <p className="modal-intro">
          Создайте будущий, текущий или архивный турнир. После сохранения можно
          добавить команды, матчи и результаты.
        </p>
        <form className="tournament-editor" onSubmit={submit}>
          <div className="editor-grid">
            {textFields.map(({ field, label, placeholder, wide, multiline }) => (
              <label className={wide ? "wide-field" : ""} key={field}>
                <span>{label}</span>
                {multiline ? (
                  <textarea
                    required
                    value={String(form[field])}
                    placeholder={placeholder}
                    onChange={(event) =>
                      setField(field, event.target.value as never)
                    }
                  />
                ) : (
                  <input
                    required
                    value={String(form[field])}
                    placeholder={placeholder}
                    onChange={(event) =>
                      setField(field, event.target.value as never)
                    }
                  />
                )}
              </label>
            ))}
            <label>
              <span>Начало</span>
              <input
                required
                type="datetime-local"
                value={form.start_at}
                onChange={(event) => setField("start_at", event.target.value)}
              />
            </label>
            <label>
              <span>Окончание</span>
              <input
                required
                type="datetime-local"
                value={form.end_at}
                onChange={(event) => setField("end_at", event.target.value)}
              />
            </label>
            <label>
              <span>Дедлайн регистрации</span>
              <input
                required
                type="datetime-local"
                value={form.registration_deadline}
                onChange={(event) =>
                  setField("registration_deadline", event.target.value)
                }
              />
            </label>
            <label>
              <span>Игроков в команде</span>
              <input
                required
                type="number"
                min="1"
                max="10"
                value={form.team_size}
                onChange={(event) =>
                  setField("team_size", Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>Максимум команд</span>
              <input
                required
                type="number"
                min="2"
                max="64"
                value={form.max_teams}
                onChange={(event) =>
                  setField("max_teams", Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>Check-in, минут</span>
              <input
                required
                type="number"
                min="5"
                max="180"
                value={form.check_in_minutes}
                onChange={(event) =>
                  setField("check_in_minutes", Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>Статус</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setField("status", event.target.value as TournamentStatus)
                }
              >
                {Object.entries(statusDetails).map(([value, details]) => (
                  <option value={value} key={value}>
                    {details.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="create-form-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Отмена
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Сохраняем…" : "Создать турнир"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function useTournamentList() {
  const [data, setData] = useState<TournamentListResponse>({
    tournaments: [],
    user: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/tournaments", { cache: "no-store" });
      const result = (await response.json()) as TournamentListResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Не удалось загрузить турниры");
      }
      setData(result);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Не удалось загрузить турниры",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return { data, loading, error, reload };
}

export function PlatformShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const timer = window.setTimeout(() => setTheme(loadSavedTheme()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <main className="site-shell platform-shell" data-theme={theme}>
      <SiteHeader
        theme={theme}
        setTheme={setTheme}
        user={user}
      />
      {children}
      <footer className="platform-footer">
        <Link className="brand" href="/">
          <Image
            src="/linkens-sphere-logo.png"
            alt=""
            width={48}
            height={48}
            unoptimized
          />
          <span>
            <strong>Linken&apos;s Sphere</strong>
            <small>Esports community</small>
          </span>
        </Link>
        <p>Турниры, лиги и события нашего Dota-сообщества</p>
        <a
          className="discord-link"
          href="https://discord.gg/lsesports"
          target="_blank"
          rel="noreferrer"
        >
          Discord <FiArrowUpRight />
        </a>
        <OrganizerAccess user={user} />
      </footer>
    </main>
  );
}

export function CommunityHome() {
  const { data, loading, error } = useTournamentList();
  const featured =
    data.tournaments.find((item) => item.status === "active") ??
    data.tournaments.find((item) => item.status === "registration") ??
    data.tournaments.find((item) => item.status === "finished");
  const upcomingCount = data.tournaments.filter((item) =>
    ["registration", "active"].includes(item.status),
  ).length;
  const archiveCount = data.tournaments.filter((item) =>
    isPastTournament(item.status),
  ).length;

  return (
    <PlatformShell user={data.user}>
      <section className="platform-hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="platform-hero-copy">
          <p className="eyebrow">Linken&apos;s Sphere Esports</p>
          <h1>
            Турниры живут здесь.
            <span>История остаётся.</span>
          </h1>
          <p>
            Постоянная площадка нашего Dota-сообщества: будущие события,
            регистрация команд, расписание, результаты и архив прошедших
            турниров.
          </p>
          <div className="hero-buttons">
            <Link className="primary-button" href="/tournaments">
              Смотреть турниры <FiArrowRight />
            </Link>
            <a
              className="secondary-button"
              href="https://discord.gg/lsesports"
              target="_blank"
              rel="noreferrer"
            >
              <FaDiscord /> Наш Discord
            </a>
          </div>
          <div className="platform-numbers">
            <div>
              <strong>{upcomingCount}</strong>
              <span>текущих и будущих</span>
            </div>
            <div>
              <strong>{archiveCount}</strong>
              <span>турниров в истории</span>
            </div>
            <div>
              <strong>500+</strong>
              <span>участников приняли участие в наших турнирах</span>
            </div>
          </div>
        </div>
        <aside className="featured-event-card">
          {loading ? (
            <p>Загружаем ближайшее событие…</p>
          ) : error ? (
            <p>{error}</p>
          ) : featured ? (
            <>
              <span className={`tournament-status ${featured.status}`}>
                {statusDetails[featured.status].short}
              </span>
              <p className="card-kicker">Ближайшее событие</p>
              <h2>{featured.name}</h2>
              <p>{featured.description}</p>
              <div className="featured-date">
                <FiCalendar />
                {formatDateRange(featured.start_at, featured.end_at)}
              </div>
              <a
                className="primary-button"
                href={`/tournaments/${featured.slug}`}
              >
                Открыть событие <FiArrowRight />
              </a>
            </>
          ) : (
            <>
              <p className="card-kicker">Календарь сообщества</p>
              <h2>Новый турнир скоро появится</h2>
              <p>
                Здесь будут опубликованы регистрация, расписание и результаты.
              </p>
              <Link className="primary-button" href="/tournaments">
                Открыть раздел <FiArrowRight />
              </Link>
            </>
          )}
        </aside>
      </section>

      <section className="platform-purpose">
        <div>
          <p className="section-kicker">Одна площадка</p>
          <h2>Не страница одного турнира, а дом всех наших событий</h2>
        </div>
        <div className="purpose-grid">
          <article>
            <FiClock />
            <h3>Будущие турниры</h3>
            <p>Анонсы, даты, правила и регистрация команд.</p>
          </article>
          <article>
            <FiUsers />
            <h3>Турниры в процессе</h3>
            <p>Составы, группы, расписание матчей и таблица.</p>
          </article>
          <article>
            <FiArchive />
            <h3>Архив и результаты</h3>
            <p>Прошлые события остаются доступными вместе со счётом матчей.</p>
          </article>
        </div>
      </section>
    </PlatformShell>
  );
}

export function TournamentsDirectory() {
  const { data, loading, error, reload } = useTournamentList();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "archive">("all");
  const [toast, setToast] = useState("");

  const visibleTournaments = useMemo(() => {
    if (filter === "upcoming") {
      return data.tournaments.filter((item) =>
        isUpcomingTournament(item.status),
      );
    }
    if (filter === "archive") {
      return data.tournaments.filter((item) =>
        isPastTournament(item.status),
      );
    }
    return data.tournaments;
  }, [data.tournaments, filter]);

  async function changeStatus(id: number, status: TournamentStatus) {
    const response = await fetch("/api/tournaments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok
        ? status === "archived"
          ? "Турнир перенесён в архив"
          : "Турнир возвращён из архива"
        : result.error ?? "Не удалось изменить статус",
    );
    if (response.ok) await reload();
  }

  return (
    <PlatformShell user={data.user}>
      <section className="directory-hero">
        <div>
          <p className="eyebrow">Календарь Linken&apos;s Sphere</p>
          <h1>Турниры</h1>
          <p>
            Будущие регистрации, идущие соревнования и полная история
            завершённых событий.
          </p>
        </div>
        {data.user?.isAdmin && (
          <button className="primary-button" onClick={() => setCreateOpen(true)}>
            <FiPlus /> Добавить турнир
          </button>
        )}
      </section>

      <section className="directory-content">
        <div className="directory-toolbar">
          <div className="directory-filters" role="tablist">
            {(
              [
                ["all", "Все"],
                ["upcoming", "Текущие и будущие"],
                ["archive", "Архив"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
                role="tab"
                aria-selected={filter === value}
              >
                {label}
              </button>
            ))}
          </div>
          <span>{visibleTournaments.length} событий</span>
        </div>

        {loading ? (
          <div className="directory-empty">Загружаем турниры…</div>
        ) : error ? (
          <div className="directory-empty">{error}</div>
        ) : visibleTournaments.length ? (
          <div className="tournament-directory-grid">
            {visibleTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                isAdmin={Boolean(data.user?.isAdmin)}
                onStatusChange={changeStatus}
              />
            ))}
          </div>
        ) : (
          <div className="directory-empty">
            <FiCalendar />
            <h2>
              {filter === "archive"
                ? "Архив пока пуст"
                : "В этом разделе пока нет турниров"}
            </h2>
            <p>
              {data.user?.isAdmin
                ? "Добавьте событие через панель организатора."
                : "Следите за анонсами в нашем Discord."}
            </p>
          </div>
        )}
      </section>

      {createOpen && (
        <TournamentForm
          onClose={() => setCreateOpen(false)}
          onCreated={(slug) =>
            window.location.assign(`/tournaments/${slug}?manage=1`)
          }
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </PlatformShell>
  );
}
