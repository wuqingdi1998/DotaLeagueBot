import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { loadArchiveIdentityProfile } from "@/lib/player-identity-admin";
import { ArchiveIdentityAdmin } from "./ArchiveIdentityAdmin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Архивный участник — Linken's Sphere Esports",
};

export default async function ArchivePlayerPage({
  params,
}: {
  params: Promise<{ identityId: string }>;
}) {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const { identityId } = await params;
  const profile = await loadArchiveIdentityProfile(identityId);
  if (!profile) notFound();

  return (
    <PlatformShell user={user}>
      <section className="hall-hero participants-hero archive-player-hero">
        <span>Архивный профиль</span>
        <h1>{profile.primaryNickname}</h1>
        <p>
          Этот участник не зарегистрирован в действующей базе бота. Его
          исторические результаты сохранены и могут быть объединены или связаны
          с зарегистрированным игроком.
        </p>
      </section>
      <section className="archive-player-content">
        <ArchiveIdentityAdmin profile={profile} />
        <section className="archive-player-card">
          <h2>История турниров</h2>
          {profile.tournaments.length ? (
            <div className="archive-player-tournaments">
              {profile.tournaments.map((tournament) => (
                <Link
                  href={`/tournaments/${tournament.slug}`}
                  key={`${tournament.slug}-${tournament.nickname}`}
                >
                  <strong>{tournament.name}</strong>
                  <span>Ник в турнире: {tournament.nickname}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p>Сезонные матчи для этого профиля пока не найдены.</p>
          )}
        </section>
      </section>
    </PlatformShell>
  );
}
