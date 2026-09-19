import { PlayerStatisticsPopover } from "@/app/components/PlayerStatisticsPopover";
import type { DraftLobbyPlayer, DraftPlayer } from "../model/snapshot";
import { PlayerAvatar } from "./PlayerAvatar";

function avatarPlayer(player: DraftLobbyPlayer): DraftPlayer {
  return {
    id: player.id,
    name: player.serverName ?? player.name,
    discordName: player.name,
    avatarUrl: player.avatarUrl,
  };
}

export function DraftPlayerStatisticsPopover({
  player,
}: {
  player: DraftLobbyPlayer;
}) {
  const displayedName = player.serverName ?? player.name;
  return (
    <PlayerStatisticsPopover
      anchorClassName="fearless-lobby-player-avatar"
      dotaId={player.dotaId}
      nickname={displayedName}
      portalContainerSelector=".fearless-draft-stage"
    >
      <PlayerAvatar player={avatarPlayer(player)} freezeAnimation />
      <i
        className={`fearless-lobby-player-presence ${player.isOnline ? "online" : "offline"}`}
        aria-label={player.isOnline ? "Игрок в сети" : "Игрок не в сети"}
        title={player.isOnline ? "Игрок в сети" : "Игрок не в сети"}
      />
    </PlayerStatisticsPopover>
  );
}
