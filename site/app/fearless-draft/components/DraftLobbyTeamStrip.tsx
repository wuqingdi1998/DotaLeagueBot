import { buildPlayerLinks } from "@/lib/player-links";
import type { DraftLobbyPlayer, DraftPlayer } from "../model/snapshot";
import { DraftProfileServiceLogo } from "./DraftProfileServiceLogo";
import { PlayerAvatar } from "./PlayerAvatar";

function avatarPlayer(player: DraftLobbyPlayer): DraftPlayer {
  return {
    id: player.id,
    name: player.name,
    discordName: player.name,
    avatarUrl: player.avatarUrl,
  };
}

export function DraftLobbyTeamStrip({
  players,
}: {
  players: DraftLobbyPlayer[];
}) {
  return (
    <div className="fearless-lobby-team-strip">
      {players.slice(0, 5).map((player) => {
        const links = buildPlayerLinks(player.dotaId);
        return (
          <div className="fearless-lobby-player" key={player.id} title={player.name}>
            <a
              className="fearless-lobby-profile-ear left stratz"
              href={links.stratz}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`STRATZ: ${player.name}`}
              title={`Открыть STRATZ — ${player.name}`}
            >
              <DraftProfileServiceLogo service="stratz" />
            </a>
            <span className="fearless-lobby-player-avatar">
              <PlayerAvatar player={avatarPlayer(player)} freezeAnimation />
              <i
                className={`fearless-lobby-player-presence ${player.isOnline ? "online" : "offline"}`}
                aria-label={player.isOnline ? "Игрок в сети" : "Игрок не в сети"}
                title={player.isOnline ? "Игрок в сети" : "Игрок не в сети"}
              />
            </span>
            <a
              className="fearless-lobby-profile-ear right dotabuff"
              href={links.dotabuff}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`DotaBuff: ${player.name}`}
              title={`Открыть DotaBuff — ${player.name}`}
            >
              <DraftProfileServiceLogo service="dotabuff" />
            </a>
          </div>
        );
      })}
    </div>
  );
}
