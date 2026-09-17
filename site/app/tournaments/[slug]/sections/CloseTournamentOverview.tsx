"use client";

import { FiCalendar, FiLayers, FiUsers } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth, formatTime } from "../model/formatters";
import { SeasonLobbyList } from "./SeasonLobbyDisplay";

export function CloseTournamentOverview() {
  const { activeTab, data, season } = useTournament();
  if (!data?.tournament.close_event_id || activeTab !== "overview") return null;
  const round = season.data?.rounds[0];
  const registrations = round?.registrations ?? [];

  return (
    <div className="close-tournament-panel tab-panel">
      <div className="close-tournament-facts">
        <div><FiLayers /><span>Формат</span><strong>{data.tournament.format}</strong></div>
        <div><FiCalendar /><span>Начало</span><strong>
          {formatDayMonth(data.tournament.start_at)} · {formatTime(data.tournament.start_at)}
        </strong></div>
        <div><FiUsers /><span>Участники</span><strong>{registrations.length}</strong></div>
      </div>

      <section className="close-participants-card">
        <header>
          <div>
            <p className="card-kicker">Регистрация из Discord</p>
            <h3>Участники клоза</h3>
          </div>
          <span>{registrations.length}</span>
        </header>
        {registrations.length ? (
          <ul>
            {registrations.map((player, index) => (
              <li key={player.player_id}>
                <em>{index + 1}</em>
                <AvatarImage
                  source={player.avatar_url}
                  width={40}
                  height={40}
                  alt=""
                  fallback={<i>{player.nickname.slice(0, 1).toUpperCase()}</i>}
                />
                <PlayerProfileLink
                  dotaId={player.dota_id}
                  nickname={player.nickname}
                />
                <small>тир {player.tier_snapshot ?? "—"}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="season-empty-copy">Пока никто не поставил галочку в анонсе.</p>
        )}
      </section>

      {round?.lobby_configuration_status === "published" ? (
        <SeasonLobbyList
          round={round}
          isArchived={data.tournament.status === "archived"}
        />
      ) : (
        <div className="empty-standings">
          Организатор ещё формирует команды и игровое лобби.
        </div>
      )}
    </div>
  );
}
