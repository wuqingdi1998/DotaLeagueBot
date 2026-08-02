import { FiEdit3, FiList, FiStar, FiTrash2 } from "react-icons/fi";
import { predictionScores, type PredictionScore } from "../model/predictions";
import type { PredictionAdminMatch } from "../services/prediction-repository";
import { groupPredictionMatchesByDate, predictionTimeValue } from "./prediction-admin-model";

function predictionDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00+03:00`));
}

export function PredictionScheduleList({
  matches,
  results,
  activeResultMatchId,
  isSaving,
  onEdit,
  onOpenResult,
  onResultChange,
  onSaveResult,
  onDeleteMatch,
  onDeleteDay,
}: {
  matches: PredictionAdminMatch[];
  results: Record<string, PredictionScore>;
  activeResultMatchId: string | null;
  isSaving: boolean;
  onEdit: (match: PredictionAdminMatch) => void;
  onOpenResult: (matchId: string) => void;
  onResultChange: (matchId: string, score: PredictionScore) => void;
  onSaveResult: (matchId: string) => void;
  onDeleteMatch: (match: PredictionAdminMatch) => void;
  onDeleteDay: (dateKey: string) => void;
}) {
  const groupedMatches = groupPredictionMatchesByDate(matches);
  return (
    <section className="prediction-admin-panel prediction-admin-schedule">
      <div className="prediction-admin-panel-heading">
        <div><span>Сохранённое расписание</span><h2>Дни и матчи</h2></div>
        <FiList aria-hidden="true" />
      </div>
      {groupedMatches.length ? groupedMatches.map((group) => (
        <section className="prediction-admin-day" key={group.dateKey}>
          <header>
            <div><strong>{predictionDateLabel(group.dateKey)}</strong><span>{group.matches.length} матча</span></div>
            <button className="prediction-admin-delete" type="button" disabled={isSaving} onClick={() => onDeleteDay(group.dateKey)}>
              <FiTrash2 aria-hidden="true" /> Удалить день
            </button>
          </header>
          <div className="prediction-admin-results">
            {group.matches.map((match) => (
              <article key={match.id}>
                <div>
                  <span>Матч {match.position} · {predictionTimeValue(match.startsAt)} МСК</span>
                  <strong>{match.teamA.name} — {match.teamB.name}</strong>
                </div>
                <div className="prediction-admin-match-actions">
                  <button type="button" disabled={match.actualScore !== null} onClick={() => onEdit(match)}>
                    <FiEdit3 aria-hidden="true" /> Редактировать матч
                  </button>
                  <button className="prediction-admin-delete" type="button" disabled={isSaving} onClick={() => onDeleteMatch(match)}>
                    <FiTrash2 aria-hidden="true" /> Удалить матч
                  </button>
                  {match.actualScore ? (
                    <b className="prediction-admin-finished">Итог: {match.actualScore}</b>
                  ) : activeResultMatchId === match.id ? (
                    <div className="prediction-admin-result-editor">
                      <select value={results[match.id]} onChange={(event) => onResultChange(match.id, event.target.value as PredictionScore)}>
                        {predictionScores.map((score) => <option key={score}>{score}</option>)}
                      </select>
                      <button type="button" disabled={isSaving} onClick={() => onSaveResult(match.id)}>
                        <FiStar aria-hidden="true" /> Сохранить и раздать звёзды
                      </button>
                    </div>
                  ) : (
                    <button type="button" disabled={isSaving} onClick={() => onOpenResult(match.id)}>
                      Проставить результат
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )) : <p className="prediction-admin-empty">Матчей пока нет. Выберите дату и заполните первый день.</p>}
    </section>
  );
}
