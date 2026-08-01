"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FaDiscord } from "react-icons/fa";
import { SiBoosty } from "react-icons/si";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { useHeaderActionCompaction } from "./header/useHeaderActionCompaction";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiLogIn,
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

function AuthErrorBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = getAuthErrorMessage(searchParams.get("authError"));
  if (!authError) return null;

  function dismissAuthError() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("authError");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="auth-error-banner" role="alert">
      <span>{authError}</span>
      <button
        type="button"
        aria-label="Закрыть сообщение об ошибке входа"
        onClick={dismissAuthError}
      >
        <FiX aria-hidden="true" />
      </button>
    </div>
  );
}

export function SiteHeader({
  theme,
  setTheme,
  user,
  discordUrl = "https://discord.gg/lsesports",
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { actionsRef, headerRef, navigationRef } =
    useHeaderActionCompaction();

  function switchTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("ls-theme", next);
  }

  const homeActive = pathname === "/";
  const tournamentsActive = pathname.startsWith("/tournaments");
  const hallActive = pathname.startsWith("/hall-of-fame");
  const participantsActive = pathname.startsWith("/participants");

  return (
    <header ref={headerRef} className="site-header platform-header">
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

      <nav
        ref={navigationRef}
        className="platform-navigation"
        aria-label="Основная навигация"
      >
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
        <Link
          className={participantsActive ? "active" : undefined}
          href="/participants"
          aria-current={participantsActive ? "page" : undefined}
        >
          Участники
        </Link>
        <a href={discordUrl} target="_blank" rel="noreferrer">
          Наш Discord <FiArrowUpRight aria-hidden="true" />
        </a>
      </nav>

      <div className="header-actions" ref={actionsRef}>
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
        <a
          className="boosty-button"
          href="https://boosty.to/linkenssphere"
          target="_blank"
          rel="noreferrer"
          aria-label="Открыть Linken's Sphere на Boosty"
        >
          <SiBoosty aria-hidden="true" />
          <span>Boosty</span>
        </a>
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
              aria-label={`Открыть меню профиля ${user.serverName}`}
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
            aria-label="Войти через Discord"
          >
            <FaDiscord
              className="login-icon-discord"
              aria-hidden="true"
            />
            <FiLogIn
              className="login-icon-mobile"
              aria-hidden="true"
            />
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
          <Link
            className={participantsActive ? "active" : undefined}
            href="/participants"
            aria-current={participantsActive ? "page" : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            Участники
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
      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>
    </header>
  );
}
