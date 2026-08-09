"use client";

import Image from "next/image";
import { useState } from "react";
import type { DraftPlayer } from "../model/snapshot";

export function PlayerAvatar({ player }: { player: DraftPlayer }) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = player.avatarUrl;
  if (!avatarUrl || avatarUrl === failedAvatarUrl) {
    return (
      <span className="fearless-player-avatar fallback">
        {player.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      className="fearless-player-avatar"
      src={avatarUrl}
      alt=""
      width={48}
      height={48}
      unoptimized
      onError={() => setFailedAvatarUrl(avatarUrl)}
    />
  );
}
