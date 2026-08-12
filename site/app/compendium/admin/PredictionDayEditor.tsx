import { FiCalendar, FiCheck, FiClock } from "react-icons/fi";
import type { PredictionMatchDraft } from "./prediction-admin-model";

export function PredictionDayEditor({
  dateKey,
  sourceDateKey,
  openingDateKey,
  openingTime,
  drafts,
  matchCount,
  teams,
  isSaving,
  onDateChange,
  onOpeningDateChange,
  onOpeningTimeChange,
  onMatchCountChange,
  onDraftChange,
  onSave,
}: {
  dateKey: string;
  sourceDateKey: string | null;
  openingDateKey: string;
  openingTime: string;
  drafts: PredictionMatchDraft[];
  matchCount: 2 | 3;
  teams: Array<{ key: string; name: string }>;
  isSaving: boolean;
  onDateChange: (dateKey: string) => void;
  onOpeningDateChange: (dateKey: string) => void;
  onOpeningTimeChange: (time: string) => void;
  onMatchCountChange: (count: 2 | 3) => void;
  onDraftChange: (index: number, update: Partial<PredictionMatchDraft>) => void;
  onSave: () => void;
}) {
  const cannotRemoveThirdMatch = drafts[2].isLocked;
  const isRelocating = sourceDateKey !== null && sourceDateKey !== dateKey;
  return (
    <section className="prediction-admin-panel" id="prediction-day-editor">
      <div className="prediction-admin-panel-heading">
        <div><span>Редактор дня</span><h2>Матчи для прогнозов</h2></div>
        <div className="prediction-admin-day-controls">
          <label className="prediction-admin-date">
            <FiCalendar aria-hidden="true" />
            <span>Дата по Москве</span>
            <input type="date" value={dateKey} onChange={(event) => onDateChange(event.target.value)} />
          </label>
          <fieldset className="prediction-admin-opening">
            <legend>Открыть прогнозы</legend>
            <label>
              <FiCalendar aria-hidden="true" />
              <span>Дата</span>
              <input
                required
                type="date"
                value={openingDateKey}
                onChange={(event) => onOpeningDateChange(event.target.value)}
              />
            </label>
            <label>
              <FiClock aria-hidden="true" />
              <span>Время МСК</span>
              <input
                required
                type="time"
                value={openingTime}
                onChange={(event) => onOpeningTimeChange(event.target.value)}
              />
            </label>
          </fieldset>
          <label className="prediction-admin-two-matches">
            <input
              type="checkbox"
              checked={matchCount === 2}
              disabled={cannotRemoveThirdMatch}
              onChange={(event) => onMatchCountChange(event.target.checked ? 2 : 3)}
            />
            <span>2 матча</span>
          </label>
        </div>
      </div>
      <p className="prediction-admin-help">
        {isRelocating
          ? `День будет перенесён с ${sourceDateKey} на ${dateKey}. Прогнозы участников сохранятся.`
          : "День можно заполнить или изменить в любое время. TBD выбирайте, если одна из команд ещё неизвестна."}
      </p>
      <div className={`prediction-admin-drafts match-count-${matchCount}`}>
        {drafts.slice(0, matchCount).map((draft, index) => (
          <article className={draft.isLocked ? "locked" : undefined} key={index}>
            <strong>Матч {index + 1}</strong>
            {draft.isLocked && <small>Результат уже сохранён — матч защищён от изменений</small>}
            <label>
              Первая команда
              <select disabled={draft.isLocked} value={draft.teamAKey} onChange={(event) => onDraftChange(index, { teamAKey: event.target.value })}>
                <option value="">Выберите команду</option>
                {teams.map((team) => <option value={team.key} key={team.key}>{team.name}</option>)}
              </select>
            </label>
            <span>против</span>
            <label>
              Вторая команда
              <select disabled={draft.isLocked} value={draft.teamBKey} onChange={(event) => onDraftChange(index, { teamBKey: event.target.value })}>
                <option value="">Выберите команду</option>
                {teams.map((team) => <option value={team.key} key={team.key}>{team.name}</option>)}
              </select>
            </label>
            <label><FiClock aria-hidden="true" /> Время МСК<input disabled={draft.isLocked} type="time" value={draft.time} onChange={(event) => onDraftChange(index, { time: event.target.value })} /></label>
          </article>
        ))}
      </div>
      <button type="button" className="prediction-admin-save" disabled={isSaving} onClick={onSave}>
        <FiCheck aria-hidden="true" /> {isSaving
          ? "Сохраняем…"
          : isRelocating
            ? "Перенести день и сохранить прогнозы"
            : `Сохранить ${matchCount} матча`}
      </button>
    </section>
  );
}
