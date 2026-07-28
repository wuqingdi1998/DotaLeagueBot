"use client";

import { tournamentCompetitionStages } from "@/lib/tournament-stages";
import { SeasonRoundTabStrip } from "../components/SeasonRoundTabStrip";
import { useTournament } from "../hooks/TournamentContext";
import { roleOptions } from "../model/constants";
import type { TournamentTab } from "../model/types";

export function TournamentInvitations() {
  const { answerInvitation, data } = useTournament();
  if (!data?.invitations.length) return null;

  return (
    <div className="invitation-banner">
      {data.invitations.map((invitation) => (
        <div key={invitation.application_id}>
          <span>
            Вас приглашают в <strong>{invitation.team_name}</strong> на роль{" "}
            {
              roleOptions.find((role) => role.value === invitation.role)
                ?.label
            }
          </span>
          <div>
            <button
              onClick={() =>
                void answerInvitation(invitation.application_id, "accepted")
              }
            >
              Принять
            </button>
            <button
              className="danger"
              onClick={() =>
                void answerInvitation(invitation.application_id, "declined")
              }
            >
              Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TournamentNavigation() {
  const {
    activeTab,
    adminMode,
    approvedTeams,
    data,
    pendingTeams,
    setActiveTab,
  } = useTournament();
  if (!data) return null;
  if (data.tournament.tournament_type === "seasonal") {
    return <SeasonTournamentNavigation />;
  }

  const hasPlayoffStage = tournamentCompetitionStages(
    data.tournament,
  ).some((stage) => stage.key === "playoffs");
  const mainTabs: Array<[TournamentTab, string]> = [
    ["overview", "Обзор"],
    [
      "teams",
      `Команды ${approvedTeams.length}/${data.tournament.max_teams}`,
    ],
    ["matches", "Матчи"],
    ["rules", "Дополнительные правила"],
  ];
  const stageTabs: Array<[TournamentTab, string]> = [
    ["groups", "Групповой этап"],
    ["playoffs", hasPlayoffStage ? "Плей-офф" : "Финал"],
  ];

  const renderTab = ([id, label]: [TournamentTab, string]) => (
    <button
      key={id}
      className={activeTab === id ? "active" : ""}
      onClick={() => setActiveTab(id)}
      role="tab"
      aria-selected={activeTab === id}
    >
      {label}
    </button>
  );

  return (
    <div
      className="tabs tournament-tabs"
      role="tablist"
      aria-label="Разделы турнира"
    >
      <div className="tournament-tabs-main">{mainTabs.map(renderTab)}</div>
      <div className="tournament-tabs-stages">
        {stageTabs.map(renderTab)}
        {adminMode && (
          <button
            className={`admin-tab${activeTab === "admin" ? " active" : ""}`}
            onClick={() => setActiveTab("admin")}
            role="tab"
            aria-selected={activeTab === "admin"}
          >
            Управление
            {pendingTeams.length ? ` · ${pendingTeams.length}` : ""}
          </button>
        )}
      </div>
    </div>
  );
}

function SeasonTournamentNavigation() {
  const { activeTab, adminMode, data, season, setActiveTab } = useTournament();
  const rounds = season.data?.rounds ?? [];
  if (!data) return null;

  return (
    <div
      className="tabs tournament-tabs season-tournament-tabs"
      role="tablist"
      aria-label="Разделы сезонного турнира"
    >
      <div className="tournament-tabs-main season-navigation-primary">
        {[
          ["overview", "Обзор"],
          ["standings", "Таблица"],
        ].map(([id, label]) => (
          <button
            className={activeTab === id ? "active" : ""}
            key={id}
            onClick={() =>
              season.openTab(id as "overview" | "standings")
            }
            role="tab"
            aria-selected={activeTab === id}
          >
            {label}
          </button>
        ))}
      </div>

      <SeasonRoundTabStrip
        activeRoundNumber={season.activeRoundNumber}
        activeTab={activeTab}
        isOrganizer={adminMode}
        rounds={rounds}
        onOpenRound={season.openRound}
      />

      {adminMode && (
        <button
          className={`admin-tab season-navigation-admin${
            activeTab === "admin" ? " active" : ""
          }`}
          onClick={() => {
            setActiveTab("admin");
            season.openTab("admin");
          }}
          role="tab"
          aria-selected={activeTab === "admin"}
        >
          Управление
        </button>
      )}
    </div>
  );
}
