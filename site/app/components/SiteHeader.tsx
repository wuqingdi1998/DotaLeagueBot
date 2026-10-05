"use client";

import { logoutAndReload } from "@/lib/logout-action";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FaDiscord } from "react-icons/fa";
import { SiBoosty } from "react-icons/si";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { useHeaderNavigation } from "./header/useHeaderNavigation";
import { HeaderNavigationLink } from "./header/HeaderNavigationLink";
import { AvatarImage } from "./AvatarImage";
import { useHeaderActionCompaction } from "./header/useHeaderActionCompaction";
import { PlayerActionNotificationBadge } from "./header/PlayerActionNotificationBadge";
import { ParticipantViewToggle } from "./ParticipantViewToggle";
import { OctoberClanBadge } from "./october-clan-badges/OctoberClanBadge";
import { CompendiumNavigationLink } from "./header/CompendiumNavigationLink";
import {
  FiArrowRight,
  FiDatabase,
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
  organizerAccess: "trusted" | "password" | null;
  hasOrganizerAccess?: boolean;
  isParticipantView?: boolean;
  isStandaloneOrganizer?: boolean;
};

type SiteHeaderProps = {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  user: SessionUser | null;
  discordUrl?: string;
  profileMenuExtras?: React.ReactNode;
};

const longProfileNameLength = 24;

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
  profileMenuExtras,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const { beginNavigation, cancelAnimation, isMobileAnimation } = useHeaderNavigation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobileMenuVisible = mobileMenuOpen || isMobileAnimation;
  const { actionsRef, headerRef, navigationRef } =
    useHeaderActionCompaction();

  function switchTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("ls-theme", next);
  }

  const homeActive = pathname === "/";
  const seasonActive = pathname === "/season" || pathname.startsWith("/season/");
  const tournamentsActive =
    pathname.startsWith("/tournaments") || pathname.startsWith("/season-lobby/");
  const calendarActive = pathname.startsWith("/calendar");
  const hallActive = pathname.startsWith("/hall-of-fame");
  const participantsActive = pathname.startsWith("/participants");
  const compendiumActive = pathname === "/compendium";
  const hasLongProfileName =
    (user?.serverName.length ?? 0) > longProfileNameLength;

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
        <HeaderNavigationLink
          beginNavigation={beginNavigation}
          isActive={homeActive}
          href="/"
        >
          Главная
        </HeaderNavigationLink>
        <HeaderNavigationLink
          beginNavigation={beginNavigation}
          isActive={tournamentsActive}
          href="/tournaments"
        >
          Турниры
        </HeaderNavigationLink>
        <HeaderNavigationLink
          beginNavigation={beginNavigation}
          isActive={seasonActive}
          href="/season"
        >
          Сезон
        </HeaderNavigationLink>
        {user && !user.isStandaloneOrganizer && (
          <CompendiumNavigationLink
            beginNavigation={beginNavigation}
            isActive={compendiumActive}
          />
        )}
        <HeaderNavigationLink
          beginNavigation={beginNavigation}
          isActive={calendarActive}
          href="/calendar"
        >
          Календарь
        </HeaderNavigationLink>
        <HeaderNavigationLink
          beginNavigation={beginNavigation}
          isActive={hallActive}
          href="/hall-of-fame"
        >
          Зал славы
        </HeaderNavigationLink>
        <HeaderNavigationLink
          beginNavigation={beginNavigation}
          isActive={participantsActive}
          href="/participants"
        >
          Участники
        </HeaderNavigationLink>
      </nav>

      <div className="header-actions" ref={actionsRef}>
        <button
          className="mobile-menu-button"
          type="button"
          onClick={() => {
            cancelAnimation();
            setMobileMenuOpen(!isMobileMenuVisible);
          }}
          aria-label={isMobileMenuVisible ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isMobileMenuVisible}
          aria-controls="mobile-primary-navigation"
        >
          {isMobileMenuVisible ? <FiX /> : <FiMenu />}
        </button>
        <a
          className="community-action-button discord-community-button"
          href={discordUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Открыть наш Discord"
        >
          <FaDiscord aria-hidden="true" />
        </a>
        <Link
          className="community-action-button boosty-button boosty-action-button"
          href="/boosty"
          aria-label="Преимущества подписки Boosty"
        >
          <SiBoosty aria-hidden="true" />
        </Link>
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
              className={
                hasLongProfileName
                  ? "player-profile-button has-long-name"
                  : "player-profile-button"
              }
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              aria-label={`Открыть меню профиля ${user.serverName}`}
              aria-expanded={profileOpen}
            >
              <AvatarImage
                source={user.avatarUrl}
                className="player-profile-avatar"
                alt=""
                width={38}
                height={38}
                unoptimized
                fallback={
                  <span className="player-profile-avatar fallback">
                    {user.playerName.slice(0, 1).toUpperCase()}
                  </span>
                }
              />
              <span className="player-profile-copy">
                <span className="player-profile-name-row">
                  <strong>{user.serverName}</strong>
                  {!user.isStandaloneOrganizer && (
                    <OctoberClanBadge dotaId={user.dotaId} display="header" />
                  )}
                </span>
                <small>
                  {user.isStandaloneOrganizer
                    ? "Серверная сессия"
                    : "Профиль участника"}
                </small>
              </span>
            </button>
            {!user.isStandaloneOrganizer && (
              <PlayerActionNotificationBadge playerId={user.discordId} />
            )}
            {profileOpen && (
              <div className="player-profile-popover">
                <span className="player-profile-name-row">
                  <strong>{user.serverName}</strong>
                  {!user.isStandaloneOrganizer && (
                    <OctoberClanBadge dotaId={user.dotaId} display="header" />
                  )}
                </span>
                {user.isStandaloneOrganizer ? (
                  <>
                    <span>Вход по паролю организатора</span>
                    <Link
                      className="profile-popover-link"
                      href="/organizer#dashboard"
                      onClick={() => setProfileOpen(false)}
                    >
                      Панель организатора <FiArrowRight aria-hidden="true" />
                    </Link>
                    {profileMenuExtras ? profileMenuExtras : null}
                  </>
                ) : (
                  <>
                    <span>Discord: {user.username}</span>
                    <Link
                      className="profile-popover-link"
                      href={`/players/${user.dotaId}`}
                      onClick={() => setProfileOpen(false)}
                    >
                      Открыть страницу игрока <FiArrowRight aria-hidden="true" />
                    </Link>
                    {user.hasOrganizerAccess && (
                      <>
                        <ParticipantViewToggle isEnabled={Boolean(user.isParticipantView)} />
                        <Link
                          className="profile-popover-link"
                          href="/compendium/base"
                          onClick={() => setProfileOpen(false)}
                        >
                          База компендиума <FiDatabase aria-hidden="true" />
                        </Link>
                        {profileMenuExtras}
                      </>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={logoutAndReload}
                >
                  {user.isStandaloneOrganizer ? "Выйти" : "Выйти из профиля"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            className="discord-login"
            href={`/login?returnTo=${encodeURIComponent(pathname)}`}
            aria-label="Открыть страницу входа"
          >
            <FiLogIn
              className="login-icon-discord"
              aria-hidden="true"
            />
            <FiLogIn
              className="login-icon-mobile"
              aria-hidden="true"
            />
            <span>Войти</span>
          </Link>
        )}
      </div>

      {isMobileMenuVisible && (
        <nav
          className="mobile-navigation"
          id="mobile-primary-navigation"
          aria-label="Мобильная навигация"
        >
          <HeaderNavigationLink
            beginNavigation={beginNavigation}
            isActive={homeActive}
            href="/"
            onSelect={() => setMobileMenuOpen(false)}
          >
            Главная
          </HeaderNavigationLink>
          <HeaderNavigationLink
            beginNavigation={beginNavigation}
            isActive={tournamentsActive}
            href="/tournaments"
            onSelect={() => setMobileMenuOpen(false)}
          >
            Турниры
          </HeaderNavigationLink>
          <HeaderNavigationLink
            beginNavigation={beginNavigation}
            isActive={seasonActive}
            href="/season"
            onSelect={() => setMobileMenuOpen(false)}
          >
            Сезон
          </HeaderNavigationLink>
          {user && !user.isStandaloneOrganizer && (
            <CompendiumNavigationLink
              beginNavigation={beginNavigation}
              isActive={compendiumActive}
              onSelect={() => setMobileMenuOpen(false)}
            />
          )}
          <HeaderNavigationLink
            beginNavigation={beginNavigation}
            isActive={calendarActive}
            href="/calendar"
            onSelect={() => setMobileMenuOpen(false)}
          >
            Календарь
          </HeaderNavigationLink>
          <HeaderNavigationLink
            beginNavigation={beginNavigation}
            isActive={hallActive}
            href="/hall-of-fame"
            onSelect={() => setMobileMenuOpen(false)}
          >
            Зал славы
          </HeaderNavigationLink>
          <HeaderNavigationLink
            beginNavigation={beginNavigation}
            isActive={participantsActive}
            href="/participants"
            onSelect={() => setMobileMenuOpen(false)}
          >
            Участники
          </HeaderNavigationLink>
        </nav>
      )}
      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>
    </header>
  );
}
