"use client";

import Image from "next/image";
import { OrganizerAccess } from "../../OrganizerAccess";
import { OrganizerArchiveLink } from "../../OrganizerArchiveLink";
import { useTournament } from "../hooks/TournamentContext";

export function TournamentFooter() {
  const { data } = useTournament();
  if (!data) return null;

  return (
    <footer className="site-footer">
      <a className="brand" href="#top">
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
      </a>
      <p>Создано сообществом для сообщества · 2026</p>
      <OrganizerArchiveLink isOrganizer={data.user?.isAdmin ?? false} />
      <OrganizerAccess
        user={data.user}
        manageHref={`/tournaments/${data.tournament.slug}?manage=1`}
      />
    </footer>
  );
}
