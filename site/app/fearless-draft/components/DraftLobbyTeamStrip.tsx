import { buildPlayerLinks } from "@/lib/player-links";
import type { DraftLobbyPlayer } from "../model/snapshot";
import { DraftPlayerStatisticsPopover } from "./DraftPlayerStatisticsPopover";
import { DraftProfileServiceLogo } from "./DraftProfileServiceLogo";

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
          <div className="fearless-lobby-player" key={player.id}>
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
            <DraftPlayerStatisticsPopover player={player} />
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
