import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FaMedal } from "react-icons/fa";
import { getSession } from "@/lib/auth";
import { loadHallOfFame } from "@/lib/player-profile";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Зал славы — Linken's Sphere Esports",
  description: "Медальный зачёт участников турниров Linken's Sphere Esports.",
};

export default async function HallOfFamePage() {
  const [players, user] = await Promise.all([loadHallOfFame(), getSession()]);

  return (
    <PlatformShell user={user}>
      <section className="hall-hero">
        <p className="eyebrow">История сообщества</p>
        <h1>Зал славы</h1>
        <p>
          Медальный зачёт всех зарегистрированных участников. Первые награды
          появятся здесь после добавления результатов турниров.
        </p>
      </section>

      <section className="hall-content">
        <div className="hall-table" role="table" aria-label="Медальный зачёт">
          <div className="hall-row hall-head" role="row">
            <span role="columnheader">Место</span>
            <span role="columnheader">Игрок</span>
            <span role="columnheader">Золото</span>
            <span role="columnheader">Серебро</span>
            <span role="columnheader">Бронза</span>
            <span role="columnheader">Всего</span>
          </div>
          {players.map((player, index) => {
            const total =
              player.medals.gold + player.medals.silver + player.medals.bronze;
            return (
              <Link
                className="hall-row"
                href={`/players/${player.dotaId}`}
                role="row"
                key={player.dotaId}
              >
                <strong role="cell">{index + 1}</strong>
                <span className="hall-player" role="cell">
                  {player.avatarUrl ? (
                    <Image
                      src={player.avatarUrl}
                      alt=""
                      width={46}
                      height={46}
                      unoptimized
                    />
                  ) : (
                    <i>{player.nickname.slice(0, 1).toUpperCase()}</i>
                  )}
                  <b>{player.nickname}</b>
                </span>
                <span className="hall-medal gold" role="cell">
                  <FaMedal aria-hidden="true" /> {player.medals.gold}
                </span>
                <span className="hall-medal silver" role="cell">
                  <FaMedal aria-hidden="true" /> {player.medals.silver}
                </span>
                <span className="hall-medal bronze" role="cell">
                  <FaMedal aria-hidden="true" /> {player.medals.bronze}
                </span>
                <strong role="cell">{total}</strong>
              </Link>
            );
          })}
        </div>
      </section>
    </PlatformShell>
  );
}
