"use client";

import { useMemo } from "react";
import { ImagePreloader } from "../../components/ImagePreloader";
import { staticAvatarUrl } from "../model/avatar";
import type { DraftLobbyPlayer } from "../model/snapshot";

const EMPTY_LOBBY_PLAYERS: readonly DraftLobbyPlayer[] = [];

export function DraftAvatarPreloader({
  firstCaptainAvatarUrl,
  secondCaptainAvatarUrl,
  lobbyPlayers = EMPTY_LOBBY_PLAYERS,
}: {
  firstCaptainAvatarUrl: string | null;
  secondCaptainAvatarUrl: string | null;
  lobbyPlayers?: readonly DraftLobbyPlayer[];
}) {
  const imageUrls = useMemo(() => {
    const captainAvatarUrls = [
      firstCaptainAvatarUrl,
      secondCaptainAvatarUrl,
    ].flatMap((avatarUrl) => avatarUrl ? [avatarUrl] : []);
    const lobbyAvatarUrls = lobbyPlayers.flatMap((player) =>
      player.avatarUrl ? [player.avatarUrl] : []
    );

    return Array.from(new Set(
      [...captainAvatarUrls, ...lobbyAvatarUrls].map(staticAvatarUrl),
    ));
  }, [firstCaptainAvatarUrl, lobbyPlayers, secondCaptainAvatarUrl]);

  return (
    <ImagePreloader
      imageUrls={imageUrls}
      concurrency={10}
      startMode="immediate"
    />
  );
}
