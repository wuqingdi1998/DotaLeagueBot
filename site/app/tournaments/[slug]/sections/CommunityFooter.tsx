"use client";

import Image from "next/image";
import { FaDiscord } from "react-icons/fa";
import { FiArrowUpRight } from "react-icons/fi";
import { OrganizerAccess } from "../../OrganizerAccess";
import { useTournament } from "../hooks/TournamentContext";

export function CommunityFooter() {
  const { data } = useTournament();
  if (!data) return null;

  return (
    <>
      <section className="community-section">
        <div>
          <p className="section-kicker">Linken&apos;s Sphere Esports</p>
          <h2>
            Своя команда.
            <br />
            Своя сцена.
          </h2>
        </div>
        <div>
          <p>
            Русскоязычное Dota-сообщество, где играют, собирают команды,
            проводят лиги и смотрят турниры вместе.
          </p>
          <a
            href={data.tournament.discord_url}
            target="_blank"
            rel="noreferrer"
          >
            <FaDiscord />
            <span>
              <small>500+ участников</small>Открыть наш Discord
            </span>
            <FiArrowUpRight />
          </a>
        </div>
      </section>

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
        <OrganizerAccess
          user={data.user}
          manageHref={`/tournaments/${data.tournament.slug}?manage=1`}
        />
      </footer>
    </>
  );
}
