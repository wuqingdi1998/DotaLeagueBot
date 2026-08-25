"use client";

import { useState } from "react";
import { FaTools } from "react-icons/fa";
import { useTournament } from "../hooks/TournamentContext";
import type {
  SeasonMatch,
  SeasonMatchParticipant,
} from "../model/season-types";

export function SeasonLobbyHostButton({
  match,
  player,
}: {
  match: SeasonMatch;
  player: Pick<
    SeasonMatchParticipant,
    "player_id" | "nickname" | "is_host"
  >;
}) {
  const { season } = useTournament();
  const [isSaving, setIsSaving] = useState(false);
  if (!season.data?.isOrganizer) return null;
  return (
    <button
      className={`season-host-select ${player.is_host ? "selected" : ""}`}
      type="button"
      disabled={isSaving || player.is_host}
      title={player.is_host ? "Хост лобби" : `Назначить ${player.nickname} хостом`}
      aria-label={player.is_host ? "Хост лобби" : `Назначить ${player.nickname} хостом`}
      onClick={async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
          await season.mutate(
            "PATCH",
            {
              entity: "lobbyHost",
              matchId: match.id,
              playerId: player.player_id,
            },
            `${player.nickname} назначен хостом лобби`,
          );
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <FaTools aria-hidden="true" />
    </button>
  );
}
