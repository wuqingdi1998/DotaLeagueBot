import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiArrowLeft } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";

function PlayerAvatar({ player }: { player: CompendiumLeaderboardEntry }) {
  return (
    <span className="compendium-leaderboard-avatar" aria-hidden="true">
      {player.avatarUrl ? (
        <Image
          src={player.avatarUrl}
          alt=""
          width={48}
          height={48}
          unoptimized
        />
      ) : (
        player.playerName.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export function CompendiumLeaderboard({
  participants,
}: {
  participants: CompendiumLeaderboardEntry[];
}) {
  return (
    <main className="compendium-leaderboard-page">
      <header className="compendium-leaderboard-hero">
        <Link href="/compendium" className="compendium-leaderboard-back">
          <FiArrowLeft aria-hidden="true" /> К Компендиуму
        </Link>
        <span>THE INTERNATIONAL 2026</span>
        <h1>Рейтинг участников</h1>
        <p>Звёзды, заработанные за всё время ивента.</p>
      </header>

      <section
        className="compendium-leaderboard-card"
        aria-label="Рейтинг по звёздам"
        role="table"
      >
        <div className="compendium-leaderboard-heading" role="row">
          <span role="columnheader">Место</span>
          <span role="columnheader">Участник</span>
          <span role="columnheader">Звёзды</span>
        </div>
        {participants.length ? (
          <div className="compendium-leaderboard-list" role="rowgroup">
            {participants.map((player) => (
              <div
                className={`compendium-leaderboard-row${player.rank <= 3 ? ` place-${player.rank}` : ""}`}
                role="row"
                key={player.playerId}
              >
                <strong className="compendium-leaderboard-rank" role="cell">
                  {player.rank}
                </strong>
                <span role="cell">
                  <PlayerProfileLink
                    className="compendium-leaderboard-player"
                    dotaId={player.dotaId}
                    nickname={player.playerName}
                  >
                    <PlayerAvatar player={player} />
                    <strong>{player.playerName}</strong>
                  </PlayerProfileLink>
                </span>
                <span className="compendium-leaderboard-stars" role="cell">
                  <FaStar aria-hidden="true" /> {player.totalStars}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="compendium-leaderboard-empty">Рейтинг пока пуст.</p>
        )}
      </section>
    </main>
  );
}
