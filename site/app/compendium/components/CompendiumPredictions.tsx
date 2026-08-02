import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiClock, FiSettings } from "react-icons/fi";
import { predictionScores, type PredictionScore } from "../model/predictions";
import type { DailyPredictionMatch } from "../model/types";

function matchTimeLabel(startsAt: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

function PredictionTeam({ team }: { team: DailyPredictionMatch["teamA"] }) {
  return (
    <div className="compendium-prediction-team">
      <span><Image src={team.logoUrl} alt="" width={58} height={58} unoptimized /></span>
      <strong>{team.name}</strong>
    </div>
  );
}

function PredictionCard({
  match,
  submitting,
  onSelect,
}: {
  match: DailyPredictionMatch;
  submitting: boolean;
  onSelect: (matchId: string, score: PredictionScore) => void;
}) {
  return (
    <article className={`compendium-prediction-card${match.actualScore ? " completed" : ""}`}>
      <div className="compendium-prediction-card-heading">
        <span>Матч {match.position}</span>
        <time dateTime={match.startsAt}><FiClock aria-hidden="true" /> {matchTimeLabel(match.startsAt)} МСК</time>
      </div>
      <div className="compendium-prediction-versus">
        <PredictionTeam team={match.teamA} />
        <b>VS</b>
        <PredictionTeam team={match.teamB} />
      </div>
      <div className="compendium-score-picks" aria-label="Выберите счёт матча">
        {predictionScores.map((score) => (
          <button
            type="button"
            className={match.predictedScore === score ? "selected" : undefined}
            disabled={match.isLocked || submitting}
            onClick={() => onSelect(match.id, score)}
            key={score}
          >
            {score}
          </button>
        ))}
      </div>
      {match.actualScore ? (
        <p className="compendium-prediction-result">
          Итог: <strong>{match.actualScore}</strong>
          <span><FaStar aria-hidden="true" /> +{match.rewardStars ?? 0}</span>
        </p>
      ) : match.isLocked ? (
        <p className="compendium-prediction-note">Прогноз принят, ожидаем результат</p>
      ) : (
        <p className="compendium-prediction-note">Можно менять выбор до начала матча</p>
      )}
    </article>
  );
}

export function CompendiumPredictions({
  matches,
  isOrganizer,
  submittingMatchId,
  onSelect,
}: {
  matches: DailyPredictionMatch[];
  isOrganizer: boolean;
  submittingMatchId: string | null;
  onSelect: (matchId: string, score: PredictionScore) => void;
}) {
  return (
    <section className="compendium-predictions-section" id="compendium-predictions">
      <div className="compendium-predictions-heading">
        <div>
          <span>Ежедневные матчи TI 2026</span>
          <h2>Прогнозы</h2>
          <p>Точный счёт — 2 звезды, верный победитель — 1 звезда.</p>
        </div>
        {isOrganizer && (
          <Link href="/compendium/predictions" className="compendium-predictions-admin-link">
            <FiSettings aria-hidden="true" /> Настроить матчи
          </Link>
        )}
      </div>
      {matches.length ? (
        <div className={`compendium-predictions-grid match-count-${matches.length}`}>
          {matches.map((match) => (
            <PredictionCard
              match={match}
              submitting={submittingMatchId === match.id}
              onSelect={onSelect}
              key={match.id}
            />
          ))}
        </div>
      ) : (
        <div className="compendium-predictions-empty">
          <span aria-hidden="true">✦</span>
          <strong>Матчи скоро появятся</strong>
        </div>
      )}
    </section>
  );
}
