"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FaDiscord } from "react-icons/fa";
import {
  FiArchive,
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiClock,
  FiCrosshair,
  FiPlus,
  FiUsers,
} from "react-icons/fi";
import {
  SiteHeader,
  type SessionUser,
} from "@/app/components/SiteHeader";
import {
  isPastTournament,
  type TournamentStatus,
} from "@/lib/tournaments";
import { formatTournamentDateRange } from "@/lib/tournament-date";
import { OrganizerAccess } from "./OrganizerAccess";
import { TournamentCard } from "./hub/TournamentCard";
import {
  filterTournamentSummaries,
  loadSavedTheme,
  type TournamentDirectoryFilter,
  type TournamentListResponse,
} from "./hub/tournament-hub-model";
import { TournamentStatusBadge } from "./hub/TournamentStatusBadge";

const TournamentForm = dynamic(
  () => import("./hub/TournamentForm").then((module) => module.TournamentForm),
  { ssr: false },
);

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
        reason instanceof Error
          ? reason.message
          : "Не удалось загрузить турниры",
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
      <SiteHeader theme={theme} setTheme={setTheme} user={user} />
      {children}
      <footer className="site-footer platform-footer">
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
        <div className="platform-footer-links">
          <Link className="fearless-footer-link" href="/fearless-draft">
            <FiCrosshair /> Fearless Draft
          </Link>
          <a
            className="discord-link"
            href="https://discord.gg/lsesports"
            target="_blank"
            rel="noreferrer"
          >
            Discord <FiArrowUpRight />
          </a>
        </div>
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
    data.tournaments.find((item) => item.status === "planned") ??
    data.tournaments.find((item) => item.status === "finished");
  const upcomingCount = data.tournaments.filter((item) =>
    ["planned", "registration", "active"].includes(item.status),
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
              <span>текущих и будущих турниров</span>
            </div>
            <div>
              <strong>{archiveCount}</strong>
              <span>турниров проведено</span>
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
              <div className="featured-event-heading">
                <p className="card-kicker">Ближайшее событие</p>
                <TournamentStatusBadge
                  status={featured.status}
                  variant="short"
                />
              </div>
              <h2>{featured.name}</h2>
              <p>{featured.description}</p>
              <div className="featured-date">
                <FiCalendar />
                {formatTournamentDateRange(featured.start_at, featured.end_at)}
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
              <p className="card-kicker">Турниры сообщества</p>
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
          <h2 className="platform-purpose-title">
            <span>Сайт сообщества</span>
            <span>Linken&apos;s Sphere Esports</span>
          </h2>
        </div>
        <div className="purpose-grid">
          <article>
            <FiClock />
            <h3>Турниры</h3>
            <p>Анонсы, регистрация, расписание и результаты соревнований.</p>
          </article>
          <article>
            <FiUsers />
            <h3>Ивенты</h3>
            <p>Шоу-матчи, трансляции и другие события нашего сообщества.</p>
          </article>
          <article>
            <FiArchive />
            <h3>Архив и Зал славы</h3>
            <p>История прошедших событий, чемпионы и лучшие игроки.</p>
          </article>
        </div>
      </section>
    </PlatformShell>
  );
}

export function TournamentsDirectory() {
  const { data, loading, error, reload } = useTournamentList();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<TournamentDirectoryFilter>("all");
  const [toast, setToast] = useState("");

  const visibleTournaments = useMemo(
    () => filterTournamentSummaries(data.tournaments, filter),
    [data.tournaments, filter],
  );

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
                ["seasonal", "Сезонные"],
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
              {filter === "seasonal"
                ? "Сезонных турниров пока нет"
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

      {createOpen && data.user?.isAdmin && (
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
