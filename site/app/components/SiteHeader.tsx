"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaDiscord } from "react-icons/fa";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiMenu,
  FiMoon,
  FiSun,
  FiX,
} from "react-icons/fi";

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

type SiteHeaderProps = {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  user: SessionUser | null;
  discordUrl?: string;
};

export function SiteHeader({
  theme,
  setTheme,
  user,
  discordUrl = "https://discord.gg/lsesports",
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function switchTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("ls-theme", next);
  }

  const homeActive = pathname === "/";
  const tournamentsActive = pathname.startsWith("/tournaments");
  const hallActive = pathname.startsWith("/hall-of-fame");

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
          className={homeActive ? "active" : undefined}
          href="/"
          aria-current={homeActive ? "page" : undefined}
        >
          Главная
        </Link>
        <Link
          className={tournamentsActive ? "active" : undefined}
          href="/tournaments"
          aria-current={tournamentsActive ? "page" : undefined}
        >
          Турниры
        </Link>
        <Link
          className={hallActive ? "active" : undefined}
          href="/hall-of-fame"
          aria-current={hallActive ? "page" : undefined}
        >
          Зал славы
        </Link>
        <a href={discordUrl} target="_blank" rel="noreferrer">
          Наш Discord <FiArrowUpRight aria-hidden="true" />
        </a>
      </nav>

      <div className="header-actions">
        <button
          className="mobile-menu-button"
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-primary-navigation"
        >
          {mobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
        <button
          className="theme-button"
          type="button"
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
              type="button"
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
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/logout", { method: "POST" });
                    } finally {
                      window.location.reload();
                    }
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

      {mobileMenuOpen && (
        <nav
          className="mobile-navigation"
          id="mobile-primary-navigation"
          aria-label="Мобильная навигация"
        >
          <Link
            className={homeActive ? "active" : undefined}
            href="/"
            aria-current={homeActive ? "page" : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            Главная
          </Link>
          <Link
            className={tournamentsActive ? "active" : undefined}
            href="/tournaments"
            aria-current={tournamentsActive ? "page" : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            Турниры
          </Link>
          <Link
            className={hallActive ? "active" : undefined}
            href="/hall-of-fame"
            aria-current={hallActive ? "page" : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            Зал славы
          </Link>
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileMenuOpen(false)}
          >
            Наш Discord <FiArrowUpRight aria-hidden="true" />
          </a>
        </nav>
      )}
    </header>
  );
}
