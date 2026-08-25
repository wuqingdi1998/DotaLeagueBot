"use client";

import Image from "next/image";
import { FaTools } from "react-icons/fa";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import type {
  SeasonLobbyRoomPlayer,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

function RoomPlayer({ player }: { player: SeasonLobbyRoomPlayer }) {
  return (
    <li>
      <span
        className={`season-room-presence ${player.isOnline ? "online" : "offline"}`}
        aria-label={player.isOnline ? "В сети" : "Не в сети"}
        title={player.isOnline ? "В сети" : "Не в сети"}
      />
      {player.avatarUrl ? (
        <Image src={player.avatarUrl} alt="" width={42} height={42} />
      ) : (
        <i>{player.nickname.slice(0, 1).toUpperCase()}</i>
      )}
      <span className="season-room-player-name">
        <PlayerProfileLink
          dotaId={player.dotaId}
          nickname={player.nickname}
        >
          <strong>{player.nickname}</strong>
        </PlayerProfileLink>
        <small>
          тир {player.tier ?? "—"}
          {player.isCaptain ? " · капитан" : ""}
        </small>
      </span>
      {player.isHost && (
        <span className="season-room-host-badge" title="Хост лобби">
          <FaTools aria-hidden="true" /> Хост
        </span>
      )}
    </li>
  );
}

export function LobbyPlayerTeams({
  snapshot,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
}) {
  const teams = [
    { side: "a" as const, name: snapshot.teamAName },
    { side: "b" as const, name: snapshot.teamBName },
  ];
  return (
    <div className="season-room-teams">
      {teams.map((team) => (
        <section key={team.side}>
          <header>
            <span>Команда {team.side.toUpperCase()}</span>
            <h2>{team.name}</h2>
          </header>
          <ul>
            {snapshot.players
              .filter((player) => player.teamSide === team.side)
              .map((player) => <RoomPlayer key={player.playerId} player={player} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
