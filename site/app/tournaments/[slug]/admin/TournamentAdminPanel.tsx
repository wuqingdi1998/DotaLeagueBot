"use client";

import { TournamentContentEditor } from "../TournamentContentEditor";
import { useTournament } from "../hooks/TournamentContext";
import { ApplicationsAdmin } from "./ApplicationsAdmin";
import { MatchCreateForm } from "./MatchCreateForm";
import { MatchResultsList } from "./MatchResultsList";
import { SeasonAdminPanel } from "./SeasonAdminPanel";
import { TournamentDetailsEditor } from "./TournamentDetailsEditor";
import {
  ArchiveRostersAdmin,
  TeamResultsAdmin,
} from "./TournamentTeamsAdmin";

export function TournamentAdminPanel() {
  const {
    activeTab,
    adminMode,
    approvedTeams,
    data,
    loadData,
    pendingTeams,
    season,
    setToast,
  } = useTournament();
  if (!data || activeTab !== "admin" || !adminMode) return null;
  const isSeasonal = data.tournament.tournament_type === "seasonal";

  return (
    <div className="tab-panel admin-panel">
      <div className="admin-summary">
        {isSeasonal ? (
          <>
            <div>
              <span>Участников</span>
              <strong>{season.data?.participants.length ?? 0}</strong>
            </div>
            <div>
              <span>Туров</span>
              <strong>{data.tournament.season_round_count}</strong>
            </div>
            <div>
              <span>Опубликовано</span>
              <strong>
                {season.data?.rounds.filter((round) => round.is_visible)
                  .length ?? 0}
              </strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>Заявок</span>
              <strong>{data.applications.length}</strong>
            </div>
            <div>
              <span>Ждут решения</span>
              <strong>{pendingTeams.length}</strong>
            </div>
            <div>
              <span>Допущено</span>
              <strong>{approvedTeams.length}</strong>
            </div>
          </>
        )}
      </div>

      {!isSeasonal && <GroupGenerationToolbar />}

      <TournamentDetailsEditor
        key={data.tournament.id}
        tournament={data.tournament}
        onSaved={loadData}
        onMessage={setToast}
      />

      <TournamentContentEditor
        key={`${data.tournament.id}-${data.tournament.updated_at}`}
        tournamentId={data.tournament.id}
        initialScheduleDays={data.scheduleDays}
        initialRules={data.rules}
        initialPrizes={data.prizes}
        applications={data.applications}
        onSaved={loadData}
      />

      {isSeasonal ? (
        <SeasonAdminPanel />
      ) : (
        <>
          <ApplicationsAdmin />
          <ArchiveRostersAdmin />
          <TeamResultsAdmin />

          <section className="applications-panel match-admin">
            <div className="editor-heading">
              <div>
                <p className="card-kicker">Расписание</p>
                <h3>Матчи и результаты</h3>
              </div>
            </div>
            <MatchCreateForm />
            <MatchResultsList />
          </section>
        </>
      )}
    </div>
  );
}

function GroupGenerationToolbar() {
  const {
    generateGroups,
    groupCount,
    setGroupCount,
    setTeamsPerGroup,
    teamsPerGroup,
  } = useTournament();

  return (
    <div className="admin-toolbar">
      <div>
        <strong>Групповой этап</strong>
        <span>
          Создаст или переформирует структуру даже без команд. Доступные команды
          распределятся змейкой, а существующие матчи плей-офф сохранятся.
        </span>
      </div>
      <label>
        <span>Групп</span>
        <input
          type="number"
          min="1"
          max="8"
          value={groupCount}
          onChange={(event) => setGroupCount(Number(event.target.value))}
        />
      </label>
      <label>
        <span>Команд в группе</span>
        <input
          type="number"
          min="3"
          max="8"
          value={teamsPerGroup}
          onChange={(event) => setTeamsPerGroup(Number(event.target.value))}
        />
      </label>
      <button
        className="secondary-button"
        type="button"
        onClick={() => void generateGroups()}
      >
        Сформировать группы
      </button>
    </div>
  );
}
