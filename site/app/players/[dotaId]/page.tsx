import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaMedal } from "react-icons/fa";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiTarget,
} from "react-icons/fi";
import { getSession } from "@/lib/auth";
import { formatTournamentCompactDateRange } from "@/lib/tournament-date";
import {
  loadPublicPlayerProfile,
  profileBackgroundForSubscriptionRole,
  tournamentResultLabel,
} from "@/lib/player-profile";
import { mapWinRatePercent } from "@/lib/player-map-statistics";
import {
  loadLinkedArchiveProfiles,
  loadOrganizerPlayerIdentity,
  type OrganizerPlayerIdentity,
} from "@/lib/player-profile-organizer";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { PlayerServiceIcon } from "@/app/components/PlayerServiceIcon";
import { LinkedArchiveProfilesCard } from "./LinkedArchiveProfilesCard";
import { ProfileBadgesCard } from "./ProfileBadgesCard";
import { ProfileBackgroundPicker } from "./ProfileBackgroundPicker";
import { PlayerMapStatisticsDialog } from "./PlayerMapStatisticsDialog";

export const dynamic = "force-dynamic";

type PlayerPageProps = {
  params: Promise<{ dotaId: string }>;
};

const tournamentStatus: Record<string, string> = {
  registration: "Регистрация",
  active: "Идёт сейчас",
  finished: "Завершён",
  archived: "Архив",
};

function SubscriptionRoleBadge({
  role,
  color,
  className,
}: {
  role: string;
  color: number | null;
  className: string;
}) {
  return (
    <span
      className={`profile-subscription-role profile-subscription-role-${profileBackgroundForSubscriptionRole(
        role,
      )} ${className}`}
      style={
        color
          ? {
              "--role-color": `#${color.toString(16).padStart(6, "0")}`,
            } as React.CSSProperties
          : undefined
      }
    >
      {role}
    </span>
  );
}

function PlayerPositionsBadge({
  positions,
  className,
}: {
  positions: string | null;
  className: string;
}) {
  return positions ? (
    <span
      className={`public-profile-positions ${className}`}
      tabIndex={0}
      aria-label={`Игровые позиции: ${positions}`}
    >
      {positions}
      <span className="profile-position-tooltip" role="tooltip">
        Игровые позиции
      </span>
    </span>
  ) : (
    <span
      className={`public-profile-positions empty ${className}`}
      aria-label="Игровые позиции не указаны"
    >
      —
    </span>
  );
}

function PlayerIdentityIds({
  dotaId,
  organizerIdentity,
  className,
}: {
  dotaId: string;
  organizerIdentity: OrganizerPlayerIdentity | null;
  className: string;
}) {
  return (
    <span className={`public-profile-id-row ${className}`}>
      <span className="public-profile-dota-id">Dota ID {dotaId}</span>
      {organizerIdentity && (
        <span className="organizer-profile-discord-id">
          Discord ID {organizerIdentity.discordId}
          {organizerIdentity.isOnDiscordServer === false && (
            <span
              className="organizer-profile-discord-warning"
              role="img"
              aria-label="Участник сейчас не состоит на Discord-сервере"
              title="Участник сейчас не состоит на Discord-сервере"
            >
              !
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const { dotaId } = await params;
  const profile = await loadPublicPlayerProfile(dotaId);
  return {
    title: profile
      ? `${profile.nickname} — Linken's Sphere Esports`
      : "Игрок не найден — Linken's Sphere Esports",
    description: profile
      ? `Турнирный профиль ${profile.nickname}: результаты, история участия и награды.`
      : undefined,
  };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { dotaId } = await params;
  const [profile, user] = await Promise.all([
    loadPublicPlayerProfile(dotaId),
    getSession(),
  ]);
  if (!profile) notFound();
  const [linkedArchiveProfiles, organizerIdentity] = user?.isAdmin
    ? await Promise.all([
        loadLinkedArchiveProfiles(dotaId),
        loadOrganizerPlayerIdentity(dotaId),
      ])
    : [[], null];

  const winRate = mapWinRatePercent(profile.statistics);
  const mobileNicknameWidth = 270;
  const mobileNicknameSize = Math.max(
    15,
    Math.min(
      52,
      Math.floor(
        mobileNicknameWidth /
          Math.max(profile.nickname.length * 0.58, 1),
      ),
    ),
  );

  return (
    <PlatformShell user={user}>
      <section
        className={`player-profile-hero profile-background-${profile.backgroundKey}${
          profile.customBackgroundUrl ? " profile-background-custom" : ""
        }`}
        style={
          profile.customBackgroundUrl
            ? {
                "--profile-custom-background-desktop": `url("${profile.customBackgroundUrl}")`,
                "--profile-custom-background-mobile": `url("${
                  profile.customBackgroundMobileUrl ??
                  profile.customBackgroundUrl
                }")`,
              } as React.CSSProperties
            : undefined
        }
      >
        <div className="player-profile-identity">
          {profile.avatarUrl ? (
            <Image
              className="public-profile-avatar"
              src={profile.avatarUrl}
              alt={`Аватар игрока ${profile.nickname}`}
              width={164}
              height={164}
              priority
              unoptimized
            />
          ) : (
            <div className="public-profile-avatar fallback">
              {profile.nickname.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            {(profile.realName || profile.subscriptionRole) && (
              <div className="public-profile-heading">
                {profile.realName && (
                  <p className="public-profile-real-name">
                    {profile.realName}
                  </p>
                )}
                {profile.subscriptionRole && (
                  <SubscriptionRoleBadge
                    role={profile.subscriptionRole}
                    color={profile.subscriptionRoleColor}
                    className="profile-heading-role"
                  />
                )}
              </div>
            )}
            <div className="public-profile-name-row">
              <div
                className="public-profile-nickname-line"
                style={
                  {
                    "--mobile-nickname-size": `${mobileNicknameSize}px`,
                  } as React.CSSProperties
                }
              >
                <h1 title={profile.nickname}>{profile.nickname}</h1>
                <PlayerPositionsBadge
                  positions={profile.positions}
                  className="mobile-profile-positions"
                />
              </div>
              <div
                className="player-service-links"
                aria-label="Профили игрока на игровых сервисах"
              >
                <a
                  href={profile.links.dotabuff}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть Dotabuff"
                >
                  <PlayerServiceIcon service="dotabuff" />
                  <span>Dotabuff</span>
                </a>
                <a
                  href={profile.links.stratz}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть Stratz"
                >
                  <PlayerServiceIcon service="stratz" />
                  <span>Stratz</span>
                </a>
                <a
                  href={profile.links.steam}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть Steam"
                >
                  <PlayerServiceIcon service="steam" />
                  <span>Steam</span>
                </a>
                <PlayerIdentityIds
                  dotaId={profile.dotaId}
                  organizerIdentity={organizerIdentity}
                  className="mobile-profile-ids"
                />
              </div>
            </div>
            <div className="public-profile-meta">
              <PlayerPositionsBadge
                positions={profile.positions}
                className="desktop-profile-positions"
              />
              <PlayerIdentityIds
                dotaId={profile.dotaId}
                organizerIdentity={organizerIdentity}
                className="desktop-profile-ids"
              />
            </div>
            {user?.dotaId === profile.dotaId &&
              profile.canCustomizeBackground && (
                <ProfileBackgroundPicker
                  dotaId={profile.dotaId}
                  hasCustomBackground={profile.hasCustomBackground}
                />
              )}
          </div>
        </div>
        <div className="profile-stat-grid">
          <article>
            <span>Турниров</span>
            <strong>{profile.statistics.tournaments}</strong>
          </article>
          <article>
            <span>Побед в турнирах</span>
            <strong>{profile.statistics.tournamentWins}</strong>
          </article>
          <article>
            <span>Призовых мест</span>
            <strong>{profile.statistics.podiums}</strong>
          </article>
          <article>
            <span>Карт</span>
            <strong>{profile.statistics.maps}</strong>
          </article>
          <article>
            <span>Побед на картах</span>
            <strong>{profile.statistics.mapWins}</strong>
          </article>
          <PlayerMapStatisticsDialog
            winRate={winRate}
            tournaments={profile.mapStatisticsByTournament}
          />
        </div>
      </section>

      <section className="player-profile-content">
        <div className="profile-primary-column">
          <div className="profile-section-heading">
            <div>
              <h2>Участие и результаты</h2>
            </div>
            <span>{profile.tournamentHistory.length} турниров</span>
          </div>

          {profile.tournamentHistory.length ? (
            <div className="profile-tournament-list">
              {profile.tournamentHistory.map((tournament) => (
                <Link
                  className="profile-tournament-row"
                  href={`/tournaments/${tournament.slug}`}
                  key={tournament.id}
                >
                  <div>
                    <small>
                      {tournamentStatus[tournament.status] ?? "Турнир"}
                    </small>
                    <h3>{tournament.name}</h3>
                    <div className="profile-tournament-date">
                      <FiCalendar aria-hidden="true" />
                      <span>
                        {formatTournamentCompactDateRange(
                          tournament.startAt,
                          tournament.endAt,
                        )}
                      </span>
                    </div>
                    {tournament.teamName && (
                      <p>Команда: {tournament.teamName}</p>
                    )}
                    {tournament.usedNickname && (
                      <p className="profile-historical-nickname">
                        Ник на турнире: {tournament.usedNickname}
                      </p>
                    )}
                  </div>
                  <strong>
                    {tournamentResultLabel(
                      tournament.placement,
                      tournament.resultLabel,
                      tournament.status,
                    )}
                  </strong>
                  <FiArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <FiTarget aria-hidden="true" />
              <h3>Турниров пока нет</h3>
              <p>
                Здесь появятся подтверждённые участия и результаты игрока.
              </p>
              <Link className="primary-button compact" href="/tournaments">
                Смотреть турниры <FiArrowRight />
              </Link>
            </div>
          )}
        </div>

        <aside className="profile-side-column">
          {user?.isAdmin && (
            <LinkedArchiveProfilesCard profiles={linkedArchiveProfiles} />
          )}
          <section className="profile-side-card medal-card">
            <p className="section-kicker">Зал славы</p>
            <h2>Медали</h2>
            <div className="medal-count-grid">
              {(
                [
                  ["gold", "Золото", profile.medals.gold],
                  ["silver", "Серебро", profile.medals.silver],
                  ["bronze", "Бронза", profile.medals.bronze],
                ] as const
              ).map(([type, label, value]) => (
                <div className={`medal-count ${type}`} key={type}>
                  <FaMedal aria-hidden="true" />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <Link className="profile-card-link" href="/hall-of-fame">
              Открыть полный медальный зачёт <FiArrowRight aria-hidden="true" />
            </Link>
          </section>

          <ProfileBadgesCard badgeKeys={profile.profileBadges} />

          <section className="profile-side-card last-tournament-card">
            <p className="section-kicker">Последнее участие</p>
            {profile.lastTournament ? (
              <>
                <h2>{profile.lastTournament.name}</h2>
                {profile.lastTournament.teamName && (
                  <p>Команда: {profile.lastTournament.teamName}</p>
                )}
                {profile.lastTournament.usedNickname && (
                  <p>
                    Ник на турнире: {profile.lastTournament.usedNickname}
                  </p>
                )}
                <strong>
                  {tournamentResultLabel(
                    profile.lastTournament.placement,
                    profile.lastTournament.resultLabel,
                    profile.lastTournament.status,
                  )}
                </strong>
                <Link href={`/tournaments/${profile.lastTournament.slug}`}>
                  Открыть турнир <FiArrowUpRight aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <h2>Пока нет турнира</h2>
                <p>Первое подтверждённое участие появится здесь.</p>
              </>
            )}
          </section>
        </aside>
      </section>
    </PlatformShell>
  );
}
