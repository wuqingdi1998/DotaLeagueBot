import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiArrowLeft, FiArchive } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import {
  predictionPickState,
  type PredictionHistoryDay,
  type PredictionHistoryMatch,
} from "../model/prediction-history";
import { predictionScores, type PredictionScore } from "../model/predictions";

function historyDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00+03:00`));
}

function MatchHeading({ match }: { match: PredictionHistoryMatch }) {
  return (
    <div className="prediction-history-match-heading">
      <span>Матч {match.position}</span>
      <strong>{match.teamAName} — {match.teamBName}</strong>
      <small>{match.actualScore ? `Итог: ${match.actualScore}` : "Результата пока нет"}</small>
    </div>
  );
}

function PlayerMatchPrediction({
  match,
  predictedScore,
}: {
  match: PredictionHistoryMatch;
  predictedScore: PredictionScore | null;
}) {
  const state = predictionPickState(predictedScore, match.actualScore);
  return (
    <div className="prediction-history-pick" role="cell">
      <div className="prediction-history-options" aria-label={`Прогноз: ${predictedScore ?? "не выбран"}`}>
        {predictionScores.map((score) => {
          const isChosen = predictedScore === score;
          const isCorrect = match.actualScore === score;
          const classes = [
            "prediction-history-score",
            isCorrect ? "correct" : "",
            isChosen ? state : "",
          ].filter(Boolean).join(" ");
          return <span className={classes} key={score}>{score}</span>;
        })}
      </div>
    </div>
  );
}

function PredictionHistoryDayCard({ day }: { day: PredictionHistoryDay }) {
  return (
    <section className="prediction-history-day">
      <header>
        <span>Отчёт за день</span>
        <h2>{historyDateLabel(day.dateKey)}</h2>
      </header>
      <div className="prediction-history-table" role="table">
        <div className="prediction-history-table-head" role="row">
          <strong role="columnheader">Игрок</strong>
          {day.matches.map((match) => <MatchHeading match={match} key={match.id} />)}
          <strong role="columnheader">Звёзды</strong>
        </div>
        {day.players.length ? day.players.map((player) => (
          <div className="prediction-history-player" role="row" key={player.id}>
            <PlayerProfileLink dotaId={player.dotaId} nickname={player.playerName}>
              {player.playerName}
            </PlayerProfileLink>
            {day.matches.map((match) => {
              const pick = player.picks.find((entry) => entry.matchId === match.id);
              return (
                <PlayerMatchPrediction
                  match={match}
                  predictedScore={pick?.predictedScore ?? null}
                  key={match.id}
                />
              );
            })}
            <div className="prediction-history-stars" role="cell">
              {player.earnedStars !== null ? (
                <><span>Заработано за день</span><strong><FaStar aria-hidden="true" /> {player.earnedStars}</strong></>
              ) : (
                <span>После результатов</span>
              )}
            </div>
          </div>
        )) : (
          <p className="prediction-history-empty">В этот день участники ещё не делали прогнозов.</p>
        )}
      </div>
    </section>
  );
}

export function PredictionHistory({ days }: { days: PredictionHistoryDay[] }) {
  return (
    <main className="prediction-history-page">
      <Link href="/compendium" className="prediction-admin-back">
        <FiArrowLeft aria-hidden="true" /> Вернуться в Компендиум
      </Link>
      <header>
        <FiArchive aria-hidden="true" />
        <div><span>Только для организатора</span><h1>История прогнозов</h1></div>
        <p>Новые отчёты появляются сверху, а предыдущие дни сохраняются ниже.</p>
      </header>
      {days.length ? (
        <div className="prediction-history-days">
          {days.map((day) => <PredictionHistoryDayCard day={day} key={day.dateKey} />)}
        </div>
      ) : (
        <div className="prediction-history-no-days">История появится после создания первого дня прогнозов.</div>
      )}
    </main>
  );
}
