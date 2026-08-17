"use client";

import { useMemo } from "react";
import { SeasonLobbyBuilder } from "../admin/SeasonLobbyBuilder";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth, formatTime } from "../model/formatters";
import {
  SeasonFinalistsSummary,
  SeasonLobbyList,
} from "./SeasonLobbyDisplay";
import { SeasonRoundRegistration } from "./SeasonRoundRegistration";

export function SeasonRoundPanel() {
  const { activeTab, data, season } = useTournament();
  const round = useMemo(
    () =>
      season.data?.rounds.find(
        (item) => item.round_number === season.activeRoundNumber,
      ),
    [season.activeRoundNumber, season.data?.rounds],
  );
  if (
    !data ||
    data.tournament.tournament_type !== "seasonal" ||
    activeTab !== "round"
  ) {
    return null;
  }
  if (!season.data || !round) return <SeasonLoadState />;

  const isRegularRound = round.round_kind === "regular";
  const showPublicLobbies =
    !isRegularRound || round.lobby_configuration_status === "published";

  return (
    <div className="tab-panel season-round-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">
            {isRegularRound ? `Тур ${round.round_number}` : "Финальный этап"}
          </p>
          <h3>
            {round.name ||
              (isRegularRound ? `Тур ${round.round_number}` : "Финалы")}
          </h3>
          <p className="season-round-meta">
            {round.scheduled_at
              ? `${formatDayMonth(round.scheduled_at)} · ${formatTime(round.scheduled_at)}`
              : "Дата пока не назначена"}
          </p>
        </div>
      </div>

      {showPublicLobbies && isRegularRound && (
        <SeasonLobbyList
          round={round}
          isArchived={data.tournament.status === "archived"}
        />
      )}

      {isRegularRound && <SeasonRoundRegistration round={round} />}
      {isRegularRound && <SeasonLobbyBuilder round={round} />}

      {!isRegularRound && (
        <>
          <SeasonFinalistsSummary round={round} />
          <SeasonLobbyList
            round={round}
            isArchived={data.tournament.status === "archived"}
          />
        </>
      )}
    </div>
  );
}

function SeasonLoadState() {
  const { season } = useTournament();
  return (
    <div className="tab-panel empty-standings">
      {season.error ||
        (season.loading
          ? "Загружаем сезон…"
          : "Данные сезона пока недоступны")}
    </div>
  );
}
