import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaMedal, FaSteam } from "react-icons/fa";
import {
  FiActivity,
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiTarget,
} from "react-icons/fi";
import { SiDota2 } from "react-icons/si";
import { getSession } from "@/lib/auth";
import {
  loadPublicPlayerProfile,
  tournamentResultLabel,
} from "@/lib/player-profile";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";

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

function formatDateRange(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(startAt))} — ${formatter.format(
    new Date(endAt),
  )}`;
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

  const winRate =
    profile.statistics.matches > 0
      ? Math.round(
          (profile.statistics.matchWins / profile.statistics.matches) * 100,
        )
      : 0;

  return (
    <PlatformShell user={user}>
      <section className="player-profile-hero">
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
            {profile.realName && (
              <p className="public-profile-real-name">{profile.realName}</p>
            )}
            <div className="public-profile-name-row">
              <h1>{profile.nickname}</h1>
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
                  <SiDota2 aria-hidden="true" />
                  <span>Dotabuff</span>
                </a>
                <a
                  href={profile.links.stratz}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть Stratz"
                >
                  <FiActivity aria-hidden="true" />
                  <span>Stratz</span>
                </a>
                <a
                  href={profile.links.steam}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть Steam"
                >
                  <FaSteam aria-hidden="true" />
                  <span>Steam</span>
                </a>
              </div>
            </div>
            <div className="public-profile-meta">
              {profile.positions ? (
                <span
                  className="public-profile-positions"
                  tabIndex={0}
                  aria-label={`Игровые позиции: ${profile.positions}`}
                >
                  {profile.positions}
                  <span className="profile-position-tooltip" role="tooltip">
                    Игровые позиции
                  </span>
                </span>
              ) : (
                <span className="public-profile-positions empty">—</span>
              )}
              <span className="public-profile-dota-id">
                Dota ID {profile.dotaId}
              </span>
            </div>
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
            <span>Матчей</span>
            <strong>{profile.statistics.matches}</strong>
          </article>
          <article>
            <span>Побед в матчах</span>
            <strong>{profile.statistics.matchWins}</strong>
          </article>
          <article>
            <span>Победный процент</span>
            <strong>{winRate}%</strong>
          </article>
        </div>
      </section>

      <section className="player-profile-content">
        <div className="profile-primary-column">
          <div className="profile-section-heading">
            <div>
              <p className="section-kicker">Турнирная история</p>
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
                  <div className="profile-tournament-date">
                    <FiCalendar aria-hidden="true" />
                    <span>
                      {formatDateRange(tournament.startAt, tournament.endAt)}
                    </span>
                  </div>
                  <div>
                    <small>
                      {tournamentStatus[tournament.status] ?? "Турнир"}
                    </small>
                    <h3>{tournament.name}</h3>
                    <p>Команда: {tournament.teamName}</p>
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
            <p className="profile-card-note">
              Правила и полный «Зал славы» будут добавлены отдельным разделом.
            </p>
          </section>

          <section className="profile-side-card last-tournament-card">
            <p className="section-kicker">Последнее участие</p>
            {profile.lastTournament ? (
              <>
                <h2>{profile.lastTournament.name}</h2>
                <p>{profile.lastTournament.teamName}</p>
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
