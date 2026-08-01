"use client";

import { ArchiveRosterEditor } from "../ArchiveRosterEditor";
import { useTournament } from "../hooks/TournamentContext";

export function ArchiveRostersAdmin() {
  const { data, loadData, setToast } = useTournament();
  if (!data) return null;

  return (
    <section className="applications-panel archive-rosters-admin">
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Архивные данные</p>
          <h3>Составы и исторические тиры</h3>
          <p>
            Никнейм и тир сохраняются в том виде, в котором игрок участвовал в
            этом турнире. Для старого ника можно указать Dota ID актуального
            профиля — тогда ник станет ссылкой, но его историческое написание не
            изменится. Пустой Dota ID оставляет ник обычным текстом.
          </p>
        </div>
      </div>
      <details>
        <summary>Добавить архивную команду</summary>
        <ArchiveRosterEditor
          tournamentId={data.tournament.id}
          onSaved={loadData}
          onMessage={setToast}
        />
      </details>
      {data.applications.map((application) => (
        <details key={application.id}>
          <summary>
            {application.team_name} · {application.selection_method}
          </summary>
          <ArchiveRosterEditor
            tournamentId={data.tournament.id}
            team={application}
            onSaved={loadData}
            onMessage={setToast}
          />
        </details>
      ))}
    </section>
  );
}

export function TeamResultsAdmin() {
  const { approvedTeams, saveTeamResult } = useTournament();

  return (
    <section className="applications-panel team-results-admin">
      <div className="editor-heading">
        <div>
          <p className="card-kicker">История турнира</p>
          <h3>Итоги команд</h3>
          <p>
            Укажите место и, при необходимости, понятную подпись — например
            «Чемпион», «Финалист» или «5–6-е место». Итог автоматически появится
            в профилях всех игроков команды.
          </p>
        </div>
      </div>
      <div className="team-result-editor-list">
        {approvedTeams.map((application) => (
          <form
            className="team-result-editor-row"
            key={application.id}
            onSubmit={(event) =>
              void saveTeamResult(event, application.id)
            }
          >
            <strong>{application.team_name}</strong>
            <label>
              <span>Место</span>
              <input
                name="placement"
                type="number"
                min="1"
                max="64"
                defaultValue={application.placement ?? ""}
                placeholder="1"
              />
            </label>
            <label>
              <span>Подпись результата</span>
              <input
                name="resultLabel"
                maxLength={120}
                defaultValue={application.result_label ?? ""}
                placeholder="Например: Чемпион"
              />
            </label>
            <button className="tournament-save-button" type="submit">
              Сохранить
            </button>
          </form>
        ))}
        {!approvedTeams.length && (
          <p className="empty-admin-list">
            Сначала допустите команды к турниру.
          </p>
        )}
      </div>
    </section>
  );
}
