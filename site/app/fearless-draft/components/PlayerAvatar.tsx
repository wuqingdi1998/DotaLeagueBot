import Image from "next/image";
import type { DraftPlayer } from "../model/snapshot";

export function PlayerAvatar({ player }: { player: DraftPlayer }) {
  return player.avatarUrl ? (
    <Image
      className="fearless-player-avatar"
      src={player.avatarUrl}
      alt=""
      width={48}
      height={48}
      unoptimized
    />
  ) : (
    <span className="fearless-player-avatar fallback">
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
