import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiAward, FiCheck, FiFlag, FiTarget, FiUser } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import { AvatarImage } from "@/app/components/AvatarImage";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";
import type { StarRacePrize } from "../model/star-race";
import {
  finishedCompendiumCommunityOutcome,
  type CompendiumResultsData,
} from "../model/results";
import { StarRacePrizePreview } from "../components/StarRacePrizePreview";
import { CompendiumClanResults } from "./CompendiumClanResults";
import { CompendiumClanPrizeResults } from "./CompendiumClanPrizeResults";
import { ResultsAvailabilityCountdown, type ResultsAvailability } from "../components/ResultsAvailabilityCountdown";

function PlayerAvatar({ player }: { player: CompendiumLeaderboardEntry }) {
  return (
    <span className="compendium-results-avatar" aria-hidden="true">
      <AvatarImage
        source={player.avatarUrl}
        alt=""
        width={42}
        height={42}
        unoptimized
        fallback={player.playerName.slice(0, 1).toUpperCase()}
      />
    </span>
  );
}

function ResultsTable({
  participants,
  currentPlayerId,
  ariaLabel,
  prizes,
  isCompact = false,
}: {
  participants: CompendiumLeaderboardEntry[];
  currentPlayerId?: string;
  ariaLabel: string;
  prizes?: readonly StarRacePrize[];
  isCompact?: boolean;
}) {
  return (
    <div className="compendium-results-table" role="table" aria-label={ariaLabel}>
      <div className="compendium-results-table-heading" role="row">
        <span role="columnheader">{isCompact ? "№" : "Место"}</span>
        <span className="compendium-results-participant-heading" role="columnheader">
          Участник
        </span>
        <span role="columnheader">Звёзды</span>
      </div>
      <div role="rowgroup">
        {participants.map((player) => {
          const isCurrentPlayer = player.playerId === currentPlayerId;
          const prize = prizes?.find((prize) => prize.place === player.rank);
          return (
            <div
              className={`compendium-results-row${isCurrentPlayer ? " is-current-player" : ""}`}
              role="row"
              key={player.playerId}
            >
              <strong className="compendium-results-rank" role="cell">
                {player.rank}
              </strong>
              <span className="compendium-results-participant" role="cell">
                <PlayerProfileLink
                  className="compendium-results-player"
                  dotaId={player.dotaId}
                  nickname={player.playerName}
                  showClanBadge
                >
                  <PlayerAvatar player={player} />
                  <span>
                    <strong>{player.playerName}</strong>
                    {isCurrentPlayer && <small>Это вы</small>}
                  </span>
                </PlayerProfileLink>
                {prize && (
                  <StarRacePrizePreview prize={prize} variant="thumbnail" />
                )}
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
  availability,
}: {
  data: CompendiumResultsData;
  currentPlayerId?: string;
  availability?: ResultsAvailability;
}) {
  const isOctober = data.period === "october";
  return (
    <main className={`compendium-results-page${isOctober ? " compendium-results-page--compact" : ""}`}>
      <section className="compendium-results-hero">
        <div className="compendium-results-hero-copy">
          <div className="compendium-results-heading-meta">
            <span className="compendium-results-eyebrow">{isOctober ? "СЕЗОН 9 · 5–25 ОКТЯБРЯ 2026" : "THE INTERNATIONAL 2026"}</span>
            {isOctober && availability && <ResultsAvailabilityCountdown {...availability} />}
          </div>
          <h1>{data.closure === "settling" ? "Подведение итогов Компендиума" : "Результаты Компендиума"}</h1>
          <p>
            {isOctober
              ? data.isFinished ? "Компендиум завершён."
                : data.closure === "settling" ? "Задания завершены. Ожидаем завершения 9-го тура лиги и начисления звёзд за него. Эти результаты ещё не окончательные."
                  : "Задания доступны до 26 октября, 00:00 МСК. Итоги появятся после завершения 9-го тура лиги и начисления звёзд."
              : "Ивент завершён. Здесь навсегда остаются общий результат сообщества, личные достижения и итоги двух недель гонки за звёздами."}
          </p>
        </div>
        <div className="compendium-results-community-total">
          <FaStar aria-hidden="true" />
          <strong>{data.communityStars}</strong>
          <span>звёзд собрало сообщество</span>
        </div>
      </section>

      {isOctober && data.clans && <CompendiumClanResults clans={data.clans} isFinished={data.isFinished === true} />}
      {isOctober && <CompendiumClanPrizeResults />}

      {!isOctober && <section className="compendium-results-section compendium-community-result">
        <header className="compendium-results-section-heading">
          <span><FiAward aria-hidden="true" /> Итоги сообщества</span>
          <h2>Итог Компендиума</h2>
        </header>
        <div className="compendium-community-outcome">
          <p>
            Благодаря результатам сообщества Linken&apos;s Sphere 5x5 League
            остаётся бесплатной.
          </p>
          <div className="compendium-community-prizes">
            <article>
              <strong>{finishedCompendiumCommunityOutcome.finalsPrize}</strong>
              <span>Призовой фонд финалов лиги</span>
            </article>
            <article>
              <strong>{finishedCompendiumCommunityOutcome.leagueCupPrize}</strong>
              <span>Призовой фонд Кубка лиги</span>
            </article>
          </div>
        </div>
      </section>}

      <section className="compendium-results-section compendium-results-leaderboard">
        <header className="compendium-results-section-heading">
          {!isOctober && <span><FiAward aria-hidden="true" /> Общий зачёт</span>}
          <h2>Топ-10 Компендиума</h2>
          {!isOctober && <p>Лучшие участники по всем звёздам, заработанным за время ивента.</p>}
        </header>
        <ResultsTable
          participants={data.leaders}
          currentPlayerId={currentPlayerId}
          ariaLabel="Топ-10 Компендиума"
          isCompact={isOctober}
        />
      </section>

      <section className="compendium-results-section compendium-results-personal">
        <header className="compendium-results-section-heading">
          {!isOctober && <span><FiUser aria-hidden="true" /> Личный зачёт</span>}
          <h2>Ваш личный результат</h2>
        </header>
        {data.personal ? (
          <>
            <div className="compendium-personal-results">
              <article className="is-total">
                <FaStar />
                <span>{isOctober ? "Всего звёзд" : "Звёзд заработано всего"}</span>
                <strong className="compendium-personal-star-value">
                  <FaStar aria-hidden="true" /> {data.personal.totalStars}
                </strong>
              </article>
              <article>
                <FiCheck />
                <span>{isOctober ? "Испытания" : "Звёзд за ежедневные испытания"}</span>
                <strong className="compendium-personal-star-value">
                  <FaStar aria-hidden="true" /> {data.personal.dailyQuestStars}
                </strong>
              </article>
              <article>
                <FiFlag />
                <span>{isOctober ? "Гонка" : "Звёзд за задания гонки"}</span>
                <strong className="compendium-personal-star-value">
                  <FaStar aria-hidden="true" /> {data.personal.starRaceStars}
                </strong>
              </article>
              {!isOctober && <article>
                <FiTarget />
                <span>Звёзд за прогнозы матчей</span>
                <strong className="compendium-personal-star-value">
                  <FaStar aria-hidden="true" /> {data.personal.predictionStars}
                </strong>
              </article>}
              <article>
                <FiAward />
                <span>{isOctober ? "Сезонная лига" : "Звёзд за участие в турнире"}</span>
                <strong className="compendium-personal-star-value">
                  <FaStar aria-hidden="true" /> {data.personal.tournamentParticipationStars}
                </strong>
              </article>
            </div>
            {data.personal.otherStars !== 0 && (
              <p className="compendium-personal-note">
                {isOctober ? <>Прочие начисления и корректировки: {data.personal.otherStars} звёзд.</> : <>
                  В общей сумме также учтено {data.personal.otherStars} звёзд за
                  победы на картах клоз матчей, ручные начисления или корректировки.
                </>}
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

      <section className="compendium-results-section compendium-results-weekly">
        <header className="compendium-results-section-heading">
          {!isOctober && <span><FiFlag aria-hidden="true" /> Гонка за звёздами</span>}
          <h2>Топ-5 каждой недели</h2>
          {(!isOctober || !data.isFinished) && <p>{isOctober ? "Результаты трёх недель гонки. Места становятся окончательными после завершения каждой недели." : "Финальные места двух завершённых недель гонки."}</p>}
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
                prizes={race.prizes}
                isCompact={isOctober}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
