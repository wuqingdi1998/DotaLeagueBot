"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth, formatTime } from "../model/formatters";
import {
  SeasonFinalistsSummary,
  SeasonLobbyList,
} from "./SeasonLobbyDisplay";
import { SeasonRoundRegistration } from "./SeasonRoundRegistration";

const SeasonLobbyBuilder = dynamic(
  () =>
    import("../admin/SeasonLobbyBuilder").then(
      (module) => module.SeasonLobbyBuilder,
    ),
  { ssr: false },
);
const SeasonRegistrationAdmin = dynamic(
  () =>
    import("../admin/SeasonRegistrationAdmin").then(
      (module) => module.SeasonRegistrationAdmin,
    ),
  { ssr: false },
);
const SeasonPublishedLobbyTools = dynamic(
  () =>
    import("../admin/SeasonPublishedLobbyTools").then(
      (module) => module.SeasonPublishedLobbyTools,
    ),
  { ssr: false },
);
const SeasonLobbyHostButton = dynamic(
  () =>
    import("../admin/SeasonLobbyHostButton").then(
      (module) => module.SeasonLobbyHostButton,
    ),
  { ssr: false },
);

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
  const isOrganizer = season.data.isOrganizer;
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
              ? <time dateTime={round.scheduled_at}>
                  {formatDayMonth(round.scheduled_at)} ·{" "}
                  {formatTime(round.scheduled_at)}
                </time>
              : "Дата пока не назначена"}
          </p>
        </div>
      </div>

      {showPublicLobbies && isRegularRound && (
        <SeasonLobbyList
          round={round}
          isArchived={data.tournament.status === "archived"}
          lobbyFooter={(lobby) =>
            isOrganizer ? <SeasonPublishedLobbyTools lobby={lobby} /> : null
          }
          participantAction={(match, player) => (
            isOrganizer ? (
              <SeasonLobbyHostButton match={match} player={player} />
            ) : null
          )}
        />
      )}

      {isRegularRound && <SeasonRoundRegistration round={round} />}
      {isOrganizer && isRegularRound && <SeasonRegistrationAdmin round={round} />}
      {isOrganizer && isRegularRound && <SeasonLobbyBuilder round={round} />}

      {!isRegularRound && (
        <>
          <SeasonFinalistsSummary round={round} />
          <SeasonLobbyList
            round={round}
            isArchived={data.tournament.status === "archived"}
            lobbyFooter={(lobby) =>
              lobby.matches.some((match) =>
                ["published", "completed"].includes(match.status),
              ) ? (
                isOrganizer ? <SeasonPublishedLobbyTools lobby={lobby} /> : null
              ) : null
            }
            participantAction={(match, player) => (
              isOrganizer ? (
                <SeasonLobbyHostButton match={match} player={player} />
              ) : null
            )}
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
