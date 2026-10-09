"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FiActivity, FiArrowLeft, FiZap } from "react-icons/fi";
import { LobbyPlayerTeams } from
  "@/app/season-lobby/[matchId]/components/LobbyPlayerTeams";
import { FearlessDraftScreen } from "../FearlessDraftScreen";
import type { FearlessDraftSnapshot } from "../model/snapshot";
import { buildBot3SeasonLobbySnapshot } from "./season-lobby-preview";
import { CaptainVoting } from "@/app/season-lobby/[matchId]/components/CaptainVoting";
import type { SeasonLobbyRoomCommand } from "@/app/season-lobby/[matchId]/model/types";
import { useFearlessDraft } from "../hooks/useFearlessDraft";
import { DraftAgreementPanel } from "../sections/DraftAgreementPanel";
import { DraftLocaleProvider } from "../hooks/useDraftLocale";

export function SeasonLobbyBot3Screen({
  initialDraft,
}: {
  initialDraft: FearlessDraftSnapshot;
}) {
  const controller = useFearlessDraft(initialDraft);
  const { snapshot, error, isSending, send } = controller;
  useEffect(() => {
    if (!snapshot.series) window.location.assign("/fearless-draft");
  }, [snapshot.series]);
  if (!snapshot.series) return <main className="season-room-page">Тест завершён. <Link href="/fearless-draft">Вернуться к Fearless Draft</Link></main>;
  const room = buildBot3SeasonLobbySnapshot(snapshot);
  const isChoosingCaptain = room.status.startsWith("captain_");
  const sendCaptainCommand = (command: SeasonLobbyRoomCommand) => {
    if (command.action === "ANSWER_CAPTAIN_INTEREST") return send({ action: "BOT3_CAPTAIN_INTEREST", wantsCaptain: command.wantsCaptain });
    if (command.action === "VOTE_CAPTAIN") return send({ action: "BOT3_CAPTAIN_VOTE", candidatePlayerId: command.candidatePlayerId });
    if (command.action === "VOTE_CAPTAIN_TIEBREAK") return send({ action: "BOT3_CAPTAIN_TIEBREAK", candidatePlayerId: command.candidatePlayerId });
    return Promise.resolve(false);
  };
  const captain = room.players.find(
    (player) => player.teamSide === "a" && player.isCaptain,
  );
  return (
    <main className="season-room-page">
      <header className="season-room-hero">
        <div>
          <Link href="/fearless-draft">
            <FiArrowLeft aria-hidden="true" /> Вернуться к Fearless Draft
          </Link>
          <span>Игровое лобби · BO3 · тест Bot3</span>
          <h1>{room.lobbyName}</h1>
          <p>Свободные места заняты ботами с профилями реальных участников.</p>
        </div>
        <div className="season-room-connection online">
          <FiActivity aria-hidden="true" /> Все 10 игроков в сети
        </div>
      </header>

      <LobbyPlayerTeams snapshot={room} />
      {error && <p role="alert">{error}</p>}
      {isChoosingCaptain && <CaptainVoting snapshot={room} isSending={isSending} send={sendCaptainCommand} />}
      {isChoosingCaptain && snapshot.series && <DraftLocaleProvider>
        <DraftAgreementPanel series={snapshot.series} userId={snapshot.user.id}
          serverNow={snapshot.serverNow} isSending={isSending} send={send} />
      </DraftLocaleProvider>}

      <section className="season-room-start-controls">
        <div>
          <span>Автоматический режим</span>
          <strong>{isChoosingCaptain ? "Выбор капитанов" : "Капитаны выбраны"}</strong>
          <p>Боты отвечают и делают ходы в случайное время в пределах таймера.</p>
        </div>
        <div><span><FiZap aria-hidden="true" /> Bot3 активен</span></div>
      </section>

      {!isChoosingCaptain && <section className="season-room-draft">
        <p className="season-room-draft-perspective">
          Ваша команда участвует в драфте от лица капитана:{" "}
          <strong>{captain?.nickname ?? initialDraft.user.name}</strong>
        </p>
        <FearlessDraftScreen
          initialSnapshot={snapshot}
          controller={controller}
          lobbyPlayers={snapshot.lobbyPlayers}
        />
      </section>}
    </main>
  );
}

