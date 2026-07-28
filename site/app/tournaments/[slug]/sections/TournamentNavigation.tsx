"use client";

import { useEffect, useRef } from "react";
import { FiChevronLeft, FiChevronRight, FiEyeOff } from "react-icons/fi";
import { tournamentCompetitionStages } from "@/lib/tournament-stages";
import { roleOptions } from "../model/constants";
import { useTournament } from "../hooks/TournamentContext";
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
  const roundsRef = useRef<HTMLDivElement>(null);
  const activeRoundRef = useRef<HTMLButtonElement>(null);
  const rounds = season.data?.rounds ?? [];

  useEffect(() => {
    activeRoundRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab, season.activeRoundNumber]);

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
          ["rounds", "Туры"],
        ].map(([id, label]) => (
          <button
            className={activeTab === id ? "active" : ""}
            key={id}
            onClick={() =>
              season.openTab(id as "overview" | "standings" | "rounds")
            }
            role="tab"
            aria-selected={activeTab === id}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="season-round-navigation season-navigation-rounds">
        {rounds.length > 0 && (
          <button
            className="season-round-scroll-button"
            type="button"
            aria-label="Прокрутить туры влево"
            onClick={() =>
              roundsRef.current?.scrollBy({ left: -260, behavior: "smooth" })
            }
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
        )}
        <div
          className="tournament-tabs-stages season-round-tabs"
          ref={roundsRef}
          onWheel={(event) => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
              event.currentTarget.scrollLeft += event.deltaY;
            }
          }}
        >
          {rounds.map((round) => {
            const isActive =
              activeTab === "round" &&
              season.activeRoundNumber === round.round_number;
            return (
              <button
                className={`${isActive ? "active" : ""}${
                  !round.is_visible ? " season-round-hidden" : ""
                }`}
                key={round.id}
                ref={isActive ? activeRoundRef : undefined}
                onClick={() => season.openRound(round.round_number)}
                role="tab"
                aria-selected={isActive}
                title={
                  round.is_visible
                    ? round.name || `Тур ${round.round_number}`
                    : "Тур скрыт от обычных пользователей"
                }
              >
                {round.round_kind === "finals"
                  ? "Финалы"
                  : `Тур ${round.round_number}`}
                {!round.is_visible && adminMode && (
                  <FiEyeOff aria-label="Скрыт" />
                )}
              </button>
            );
          })}
        </div>
        {rounds.length > 0 && (
          <button
            className="season-round-scroll-button"
            type="button"
            aria-label="Прокрутить туры вправо"
            onClick={() =>
              roundsRef.current?.scrollBy({ left: 260, behavior: "smooth" })
            }
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        )}
        {adminMode && (
          <button
            className={`admin-tab${activeTab === "admin" ? " active" : ""}`}
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
    </div>
  );
}
