"use client";

import { matchUsesBracketRouting } from "@/lib/bracket";
import { useTournament } from "../hooks/TournamentContext";
import {
  formatDayMonth,
  formatTime,
  toDateTimeInput,
} from "../model/formatters";
import type {
  TeamApplication,
  TournamentMatch,
} from "../model/types";

export function MatchResultsList() {
  const { approvedTeams, data, deleteMatch, saveMatchResult } = useTournament();
  if (!data) return null;

  return (
    <div className="match-result-list">
      {data.matches.map((match) => (
        <article className="match-result-card" key={match.id}>
          <details>
            <summary>
              <span>
                <strong>
                  {match.team_a} — {match.team_b}
                </strong>
                <small>
                  {match.stage} · {formatDayMonth(match.scheduled_at)}{" "}
                  {formatTime(match.scheduled_at)} · BO{match.best_of}
                </small>
              </span>
              <b>Редактировать</b>
            </summary>
            <form
              className="match-result-form"
              onSubmit={(event) => void saveMatchResult(event, match)}
            >
              <MatchBaseFields match={match} />
              <fieldset className="match-editor-section">
                <legend>Команды, счёт и вылет</legend>
                <div className="match-team-editor-grid">
                  <TeamResultEditor
                    side="A"
                    match={match}
                    teams={approvedTeams}
                  />
                  <TeamResultEditor
                    side="B"
                    match={match}
                    teams={approvedTeams}
                  />
                </div>
              </fieldset>
              <BracketPositionFields match={match} />
              <BracketRoutingFields match={match} />
              <label className="match-decision-editor">
                <span>Комментарий организатора</span>
                <textarea
                  name="decisionNote"
                  defaultValue={match.decision_note ?? ""}
                  placeholder="Например: техническое поражение из-за игры с чужого аккаунта"
                />
              </label>
              <div className="match-result-actions">
                <button type="submit">Сохранить изменения</button>
                <button
                  className="danger"
                  type="button"
                  onClick={() => void deleteMatch(match)}
                >
                  Удалить матч
                </button>
              </div>
            </form>
          </details>
        </article>
      ))}
    </div>
  );
}

function MatchBaseFields({ match }: { match: TournamentMatch }) {
  const { data } = useTournament();
  if (!data) return null;

  return (
    <fieldset className="match-editor-section">
      <legend>Основные данные матча</legend>
      <div className="match-form-grid">
        <label>
          <span>Название этапа</span>
          <input
            name="stage"
            required
            defaultValue={match.stage}
            placeholder="Этап"
          />
        </label>
        <label>
          <span>Дата и время</span>
          <input
            name="scheduledAt"
            required
            type="datetime-local"
            defaultValue={toDateTimeInput(match.scheduled_at)}
          />
        </label>
        <label>
          <span>Группа</span>
          <select name="groupId" defaultValue={match.group_id ?? ""}>
            <option value="">Без группы</option>
            {data.groups.map((group) => (
              <option value={group.id} key={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Формат серии</span>
          <select name="bestOf" defaultValue={match.best_of}>
            {[1, 2, 3, 5].map((bestOf) => (
              <option value={bestOf} key={bestOf}>
                BO{bestOf}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Статус матча</span>
          <select name="status" defaultValue={match.status}>
            <option value="scheduled">Запланирован</option>
            <option value="ready">Команды готовы</option>
            <option value="live">Идёт</option>
            <option value="finished">Завершён</option>
            <option value="cancelled">Отменён</option>
          </select>
        </label>
        <label>
          <span>Тип результата</span>
          <select name="resultType" defaultValue={match.result_type}>
            <option value="normal">Обычный результат</option>
            <option value="technical">Технический результат</option>
            <option value="forfeit">Отказ от игры</option>
            <option value="cancelled">Матч отменён</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}

type TeamResultEditorProps = {
  side: "A" | "B";
  match: TournamentMatch;
  teams: TeamApplication[];
};

function TeamResultEditor({
  side,
  match,
  teams,
}: TeamResultEditorProps) {
  const isA = side === "A";
  const teamName = isA ? match.team_a : match.team_b;
  const applicationId = isA
    ? match.team_a_application_id
    : match.team_b_application_id;
  const placeholder = isA
    ? match.team_a_placeholder
    : match.team_b_placeholder;
  const score = isA ? match.team_a_score : match.team_b_score;
  const resultLabel = isA
    ? match.team_a_result_label
    : match.team_b_result_label;
  const fieldPrefix = isA ? "teamA" : "teamB";
  const otherEliminatedField = isA
    ? "teamBEliminated"
    : "teamAEliminated";
  const canEliminate =
    match.bracket_side &&
    match.bracket_side !== "group" &&
    applicationId;

  return (
    <div className={`match-team-admin-card team-${side.toLowerCase()}`}>
      <header>
        <span>Команда {side}</span>
        <strong>{teamName}</strong>
      </header>
      <label>
        <span>Зарегистрированная команда</span>
        <select
          name={`${fieldPrefix}Id`}
          defaultValue={applicationId ?? ""}
        >
          <option value="">Использовать подпись ниже</option>
          {teams.map((team) => (
            <option value={team.id} key={team.id}>
              {team.team_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Подпись-заполнитель</span>
        <input
          name={`${fieldPrefix}Placeholder`}
          defaultValue={placeholder ?? ""}
          placeholder={`Например: победитель группы ${side}`}
        />
      </label>
      <div className="match-team-result-grid">
        <label>
          <span>Счёт</span>
          <input
            name={`${fieldPrefix}Score`}
            type="number"
            min="0"
            defaultValue={score ?? ""}
          />
        </label>
        <label>
          <span>Обозначение</span>
          <input
            name={`${fieldPrefix}ResultLabel`}
            maxLength={20}
            defaultValue={resultLabel ?? ""}
            placeholder="tw / tl"
          />
        </label>
      </div>
      {canEliminate && (
        <label className="elimination-checkbox">
          <input
            name={`${fieldPrefix}Eliminated`}
            type="checkbox"
            defaultChecked={
              match.eliminated_team_application_id === applicationId
            }
            onChange={(event) => {
              if (!event.currentTarget.checked) return;
              const other =
                event.currentTarget.form?.elements.namedItem(
                  otherEliminatedField,
                );
              if (other instanceof HTMLInputElement) other.checked = false;
            }}
          />
          <span>Вылетела из турнира после этого матча</span>
        </label>
      )}
    </div>
  );
}

function BracketPositionFields({ match }: { match: TournamentMatch }) {
  return (
    <fieldset className="match-editor-section">
      <legend>Положение в сетке</legend>
      <div className="match-form-grid three-columns">
        <label>
          <span>Секция</span>
          <select name="bracketSide" defaultValue={match.bracket_side ?? ""}>
            <option value="">Без секции сетки</option>
            <option value="group">Групповой этап</option>
            <option value="upper">Верхняя сетка</option>
            <option value="lower">Нижняя сетка</option>
            <option value="grand_final">Гранд-финал</option>
          </select>
        </label>
        <label>
          <span>Раунд</span>
          <input
            name="bracketRound"
            type="number"
            min="1"
            defaultValue={match.bracket_round ?? ""}
          />
        </label>
        <label>
          <span>Порядок в раунде</span>
          <input
            name="bracketSlot"
            type="number"
            min="1"
            defaultValue={match.bracket_slot ?? ""}
          />
        </label>
      </div>
    </fieldset>
  );
}

function BracketRoutingFields({ match }: { match: TournamentMatch }) {
  const { data } = useTournament();
  if (!data) return null;

  if (!matchUsesBracketRouting(match)) {
    const isGroupMatch =
      match.group_id !== null || match.bracket_side === "group";
    return (
      <div className="match-routing-note">
        <strong>
          {isGroupMatch
            ? "Выход определяется итогами группы"
            : "Переходы по сетке не заданы"}
        </strong>
        <span>
          {isGroupMatch
            ? "В отдельном групповом матче победитель и проигравший никуда не переходят. Слоты в плей-офф распределяются по итоговой таблице и настройкам группы."
            : "Сначала выберите для матча секцию плей-офф и сохраните изменения. После этого можно будет связать его со следующими матчами."}
        </span>
      </div>
    );
  }

  const targets = data.matches.filter(
    (target) =>
      target.id !== match.id && matchUsesBracketRouting(target),
  );

  return (
    <fieldset className="bracket-link-editor">
      <legend>Куда проходят команды</legend>
      <MatchTargetSelect
        label="Победитель проходит в матч"
        name="winnerToMatchId"
        defaultValue={match.winner_to_match_id}
        targets={targets}
      />
      <SlotSelect
        name="winnerToSlot"
        defaultValue={match.winner_to_slot}
      />
      <MatchTargetSelect
        label="Проигравший проходит в матч"
        name="loserToMatchId"
        defaultValue={match.loser_to_match_id}
        targets={targets}
      />
      <SlotSelect name="loserToSlot" defaultValue={match.loser_to_slot} />
    </fieldset>
  );
}

function MatchTargetSelect({
  label,
  name,
  defaultValue,
  targets,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
  targets: TournamentMatch[];
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""}>
        <option value="">Не задано</option>
        {targets.map((target) => (
          <option value={target.id} key={target.id}>
            {target.stage}: {target.team_a} — {target.team_b}
          </option>
        ))}
      </select>
    </label>
  );
}

function SlotSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: "a" | "b" | null;
}) {
  return (
    <label>
      <span>Занимает сторону</span>
      <select name={name} defaultValue={defaultValue ?? ""}>
        <option value="">—</option>
        <option value="a">Команда A</option>
        <option value="b">Команда B</option>
      </select>
    </label>
  );
}
