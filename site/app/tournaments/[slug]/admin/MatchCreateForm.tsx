"use client";

import { tournamentGroupLabel } from "@/lib/tournament-group-name";

import { useTournament } from "../hooks/TournamentContext";

export function MatchCreateForm() {
  const {
    approvedTeams,
    createMatch,
    data,
    matchDraft,
    setMatchDraft,
  } = useTournament();
  if (!data) return null;

  const update = (field: keyof typeof matchDraft, value: string) => {
    setMatchDraft({ ...matchDraft, [field]: value });
  };

  return (
    <details className="match-create-panel">
      <summary>Добавить новый матч</summary>
      <form className="match-editor" onSubmit={createMatch}>
        <fieldset className="match-editor-section">
          <legend>Основные данные</legend>
          <div className="match-form-grid">
            <label>
              <span>Верхняя строка</span>
              <input
                required
                value={matchDraft.stage}
                onChange={(event) => update("stage", event.target.value)}
                placeholder="Групповой этап / Play Off"
              />
            </label>
            <label>
              <span>Нижняя строка</span>
              <input value={matchDraft.stageDetail ?? ""} maxLength={100} onChange={event => update("stageDetail", event.target.value)} placeholder="Матч 1 / Верхняя сетка · Раунд 1" />
            </label>
            <label>
              <span>Дата и время (пусто – TBA)</span>
              <input
                type="datetime-local"
                value={matchDraft.scheduledAt}
                onChange={(event) =>
                  update("scheduledAt", event.target.value)
                }
              />
            </label>
            <label>
              <span>Группа</span>
              <select
                value={matchDraft.groupId}
                onChange={(event) => update("groupId", event.target.value)}
              >
                <option value="">Без группы</option>
                {data.groups.map((group) => (
                  <option value={group.id} key={group.id}>
                    {tournamentGroupLabel(group)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Формат серии</span>
              <select
                value={matchDraft.bestOf}
                onChange={(event) => update("bestOf", event.target.value)}
              >
                {[1, 2, 3, 5].map((bestOf) => (
                  <option value={bestOf} key={bestOf}>
                    BO{bestOf}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="match-editor-section">
          <legend>Команды</legend>
          <div className="match-team-editor-grid">
            <TeamDraft
              side="A"
              teamId={matchDraft.teamAId}
              placeholder={matchDraft.teamAPlaceholder}
              teams={approvedTeams}
              onTeamChange={(value) => update("teamAId", value)}
              onPlaceholderChange={(value) =>
                update("teamAPlaceholder", value)
              }
            />
            <TeamDraft
              side="B"
              teamId={matchDraft.teamBId}
              placeholder={matchDraft.teamBPlaceholder}
              teams={approvedTeams}
              onTeamChange={(value) => update("teamBId", value)}
              onPlaceholderChange={(value) =>
                update("teamBPlaceholder", value)
              }
            />
          </div>
        </fieldset>

        <div className="match-editor-actions">
          <button className="primary-button compact" type="submit">
            Добавить матч
          </button>
        </div>
      </form>
    </details>
  );
}

type TeamDraftProps = {
  side: "A" | "B";
  teamId: string;
  placeholder: string;
  teams: Array<{ id: number; team_name: string }>;
  onTeamChange: (value: string) => void;
  onPlaceholderChange: (value: string) => void;
};

function TeamDraft({
  side,
  teamId,
  placeholder,
  teams,
  onTeamChange,
  onPlaceholderChange,
}: TeamDraftProps) {
  return (
    <div className={`match-team-admin-card team-${side.toLowerCase()}`}>
      <strong>Команда {side}</strong>
      <label>
        <span>Зарегистрированная команда</span>
        <select
          value={teamId}
          onChange={(event) => onTeamChange(event.target.value)}
        >
          <option value="">Выбрать позже</option>
          {teams.map((team) => (
            <option value={team.id} key={team.id}>
              {team.team_name}
            </option>
          ))}
        </select>
      </label>
      {!teamId && (
        <label>
          <span>Подпись до определения команды</span>
          <input
            required
            value={placeholder}
            onChange={(event) => onPlaceholderChange(event.target.value)}
            placeholder={
              side === "A"
                ? "Например: 1-е место группы A"
                : "Например: 2-е место группы B"
            }
          />
        </label>
      )}
    </div>
  );
}
