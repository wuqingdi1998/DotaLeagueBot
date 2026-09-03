"use client";

import { AvatarImage } from "@/app/components/AvatarImage";
import type { DraftPlayer } from "../model/snapshot";
import { staticAvatarUrl } from "../model/avatar";

export function PlayerAvatar({
  player,
  freezeAnimation = false,
}: {
  player: DraftPlayer;
  freezeAnimation?: boolean;
}) {
  const avatarUrl = player.avatarUrl && freezeAnimation
    ? staticAvatarUrl(player.avatarUrl)
    : player.avatarUrl;
  return (
    <AvatarImage
      className="fearless-player-avatar"
      source={avatarUrl}
      alt=""
      width={48}
      height={48}
      unoptimized
      fallback={
        <span className="fearless-player-avatar fallback">
          {player.name.slice(0, 1).toUpperCase()}
        </span>
      }
    />
  );
}
