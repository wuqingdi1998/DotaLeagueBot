import { buildPlayerLinks } from "@/lib/player-links";
import type { DraftLobbyPlayer } from "../model/snapshot";
import { DraftPlayerStatisticsPopover } from "./DraftPlayerStatisticsPopover";
import { DraftProfileServiceLogo } from "./DraftProfileServiceLogo";
import { draftTeamPlayerColor } from "../model/player-colors";
import type { CSSProperties } from "react";

export function DraftLobbyTeamStrip({
  players,
  showPlayerColors,
}: {
  players: DraftLobbyPlayer[];
  showPlayerColors: boolean;
}) {
  return (
    <div className="fearless-lobby-team-strip">
      {players.slice(0, 5).map((player, index) => {
        const links = buildPlayerLinks(player.dotaId);
        const playerStyle = showPlayerColors
          ? ({
              "--fearless-player-color": draftTeamPlayerColor(
                (index + 1) as 1 | 2 | 3 | 4 | 5,
              ),
            } as CSSProperties)
          : undefined;
        return (
          <div
            className={showPlayerColors
              ? "fearless-lobby-player has-player-color"
              : "fearless-lobby-player"}
            key={player.id}
            style={playerStyle}
          >
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
