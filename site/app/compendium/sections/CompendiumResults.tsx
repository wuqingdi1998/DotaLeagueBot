import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiAward, FiCheck, FiFlag, FiTarget, FiUser } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";
import type { CompendiumResultsData } from "../model/results";

function PlayerAvatar({ player }: { player: CompendiumLeaderboardEntry }) {
  return (
    <span className="compendium-results-avatar" aria-hidden="true">
      {player.avatarUrl ? (
        <Image
          src={player.avatarUrl}
          alt=""
          width={42}
          height={42}
          unoptimized
        />
      ) : (
        player.playerName.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function ResultsTable({
  participants,
  currentPlayerId,
  ariaLabel,
}: {
  participants: CompendiumLeaderboardEntry[];
  currentPlayerId?: string;
  ariaLabel: string;
}) {
  return (
    <div className="compendium-results-table" role="table" aria-label={ariaLabel}>
      <div className="compendium-results-table-heading" role="row">
        <span role="columnheader">Место</span>
        <span role="columnheader">Участник</span>
        <span role="columnheader">Звёзды</span>
      </div>
      <div role="rowgroup">
        {participants.map((player) => {
          const isCurrentPlayer = player.playerId === currentPlayerId;
          return (
            <div
              className={`compendium-results-row${isCurrentPlayer ? " is-current-player" : ""}`}
              role="row"
              key={player.playerId}
            >
              <strong className="compendium-results-rank" role="cell">
                {player.rank}
              </strong>
              <span role="cell">
                <PlayerProfileLink
                  className="compendium-results-player"
                  dotaId={player.dotaId}
                  nickname={player.playerName}
                >
                  <PlayerAvatar player={player} />
                  <span>
                    <strong>{player.playerName}</strong>
                    {isCurrentPlayer && <small>Это вы</small>}
                  </span>
                </PlayerProfileLink>
              </span>
              <span className="compendium-results-stars" role="cell">
                <FaStar aria-hidden="true" /> {player.totalStars}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompendiumResults({
  data,
  currentPlayerId,
}: {
  data: CompendiumResultsData;
  currentPlayerId?: string;
}) {
  const highestAchievement = data.community.unlocked.at(-1);
  return (
    <main className="compendium-results-page">
      <section className="compendium-results-hero">
        <div className="compendium-results-hero-copy">
          <span className="compendium-results-eyebrow">THE INTERNATIONAL 2026</span>
          <h1>Результаты Компендиума</h1>
          <p>
            Ивент завершён. Здесь навсегда остаются общий результат сообщества,
            личные достижения и итоги двух недель гонки за звёздами.
          </p>
        </div>
        <div className="compendium-results-community-total">
          <FaStar aria-hidden="true" />
          <strong>{data.communityStars}</strong>
          <span>звёзд собрало сообщество</span>
        </div>
      </section>

      <section className="compendium-results-section compendium-community-result">
        <header className="compendium-results-section-heading">
          <span><FiAward aria-hidden="true" /> Итоги сообщества</span>
          <h2>Чего мы достигли вместе</h2>
          {highestAchievement && <p>Главный достигнутый итог: {highestAchievement.title}</p>}
        </header>
        <div className="compendium-achievements-grid">
          {data.community.unlocked.map((reward) => (
            <article className="compendium-achievement is-unlocked" key={reward.stars}>
              <span><FiCheck aria-hidden="true" /> {reward.stars} звёзд</span>
              <h3>{reward.title}</h3>
              <p>{reward.description}</p>
            </article>
          ))}
          {data.community.next && (
            <article className="compendium-achievement is-next">
              <span><FiTarget aria-hidden="true" /> Следующая цель — {data.community.next.stars}</span>
              <h3>{data.community.next.title}</h3>
              <p>До неё не хватило {data.community.starsToNext} звёзд.</p>
            </article>
          )}
        </div>
      </section>

      <section className="compendium-results-section">
        <header className="compendium-results-section-heading">
          <span><FiAward aria-hidden="true" /> Общий зачёт</span>
          <h2>Топ-10 Компендиума</h2>
          <p>Лучшие участники по всем звёздам, заработанным за время ивента.</p>
        </header>
        <ResultsTable
          participants={data.leaders}
          currentPlayerId={currentPlayerId}
          ariaLabel="Топ-10 Компендиума"
        />
      </section>

      <section className="compendium-results-section">
        <header className="compendium-results-section-heading">
          <span><FiUser aria-hidden="true" /> Личный зачёт</span>
          <h2>Ваш личный результат</h2>
        </header>
        {data.personal ? (
          <>
            <div className="compendium-personal-results">
              <article className="is-total"><FaStar /><span>Звёзд заработано всего</span><strong>{data.personal.totalStars}</strong></article>
              <article><FiCheck /><span>Ежедневные испытания</span><strong>{data.personal.dailyQuestStars}</strong></article>
              <article><FiFlag /><span>Задания гонки</span><strong>{data.personal.starRaceStars}</strong></article>
              <article><FiTarget /><span>Прогнозы матчей</span><strong>{data.personal.predictionStars}</strong></article>
            </div>
            {data.personal.otherStars !== 0 && (
              <p className="compendium-personal-note">
                В общей сумме также учтено {data.personal.otherStars} звёзд за
                Испытание Рун и ручные начисления или корректировки.
              </p>
            )}
          </>
        ) : (
          <div className="compendium-personal-login">
            <p>Войдите через Discord, чтобы увидеть свою личную разбивку.</p>
            <Link href="/api/auth/discord?returnTo=%2Fcompendium%2Fresults">
              Показать мой результат
            </Link>
          </div>
        )}
      </section>

      <section className="compendium-results-section">
        <header className="compendium-results-section-heading">
          <span><FiFlag aria-hidden="true" /> Гонка за звёздами</span>
          <h2>Топ-5 каждой недели</h2>
          <p>Финальные места двух завершённых недель гонки.</p>
        </header>
        <div className="compendium-results-races">
          {data.races.map((race, index) => (
            <article className="compendium-race-result" key={race.id}>
              <span>Неделя {index + 1}</span>
              <h3>{race.dateLabel}</h3>
              <ResultsTable
                participants={race.leaders}
                currentPlayerId={currentPlayerId}
                ariaLabel={`Топ-5 гонки за ${race.dateLabel}`}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
