"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FiActivity, FiArrowLeft, FiShield } from "react-icons/fi";
import { FearlessDraftScreen } from "@/app/fearless-draft/FearlessDraftScreen";
import type { FearlessDraftSnapshot } from
  "@/app/fearless-draft/model/snapshot";
import { CaptainTransfer } from "./components/CaptainTransfer";
import { CaptainVoting } from "./components/CaptainVoting";
import { LobbyChat } from "./components/LobbyChat";
import { LobbyPlayerTeams } from "./components/LobbyPlayerTeams";
import { LobbyStartControls } from "./components/LobbyStartControls";
import { useSeasonLobbyRoom } from "./hooks/useSeasonLobbyRoom";
import type { SeasonLobbyRoomSnapshot } from "./model/types";

export function SeasonLobbyRoomScreen({
  initialRoom,
  initialDraft,
}: {
  initialRoom: SeasonLobbyRoomSnapshot;
  initialDraft: FearlessDraftSnapshot | null;
}) {
  const { snapshot, error, isSending, isConnected, send } =
    useSeasonLobbyRoom(initialRoom);
  const hasRequestedDraftReload = useRef(false);
  const teamCaptain = snapshot.players.find(
    (player) =>
      player.teamSide === snapshot.currentUserTeamSide && player.isCaptain,
  );

  useEffect(() => {
    if (
      snapshot.status === "drafting" &&
      !initialDraft &&
      !hasRequestedDraftReload.current
    ) {
      hasRequestedDraftReload.current = true;
      window.location.reload();
    }
  }, [initialDraft, snapshot.status]);

  return (
    <main className="season-room-page">
      <header className="season-room-hero">
        <div>
          <Link
            href={`/tournaments/${snapshot.tournamentSlug}?round=${snapshot.roundNumber}`}
          >
            <FiArrowLeft aria-hidden="true" /> Вернуться к туру
          </Link>
          <span>Игровое лобби · BO{snapshot.bestOf}</span>
          <h1>{snapshot.lobbyName}</h1>
        </div>
        <div className={`season-room-connection ${isConnected ? "online" : "reconnecting"}`}>
          {isConnected ? <FiActivity /> : <FiShield />}
          {isConnected ? "Синхронизация включена" : "Переподключение…"}
        </div>
      </header>

      {error && <div className="season-room-error" role="alert">{error}</div>}

      <div className="season-room-overview">
        <LobbyPlayerTeams snapshot={snapshot} />
        <LobbyChat snapshot={snapshot} isSending={isSending} send={send} />
      </div>

      <LobbyStartControls
        snapshot={snapshot}
        isSending={isSending}
        send={send}
      />
      <CaptainVoting
        snapshot={snapshot}
        isSending={isSending}
        send={send}
      />
      <CaptainTransfer
        snapshot={snapshot}
        isSending={isSending}
        send={send}
      />

      {snapshot.status === "drafting" && initialDraft?.series && (
        <section className="season-room-draft">
          <p className="season-room-draft-perspective">
            Ваша команда участвует в драфте от лица капитана:{" "}
            <strong>{teamCaptain?.nickname ?? "капитан команды"}</strong>
          </p>
          <FearlessDraftScreen
            initialSnapshot={initialDraft}
            seasonMatchId={snapshot.matchId}
          />
        </section>
      )}
      {snapshot.status === "drafting" && !initialDraft?.series && (
        <div className="season-room-draft-loading">Открываем Fearless Draft…</div>
      )}
    </main>
  );
}
