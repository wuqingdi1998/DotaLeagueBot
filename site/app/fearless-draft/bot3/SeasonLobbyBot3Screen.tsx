"use client";

import Link from "next/link";
import { FiActivity, FiArrowLeft, FiZap } from "react-icons/fi";
import { LobbyPlayerTeams } from
  "@/app/season-lobby/[matchId]/components/LobbyPlayerTeams";
import { FearlessDraftScreen } from "../FearlessDraftScreen";
import type { FearlessDraftSnapshot } from "../model/snapshot";
import { buildBot3SeasonLobbySnapshot } from "./season-lobby-preview";

export function SeasonLobbyBot3Screen({
  initialDraft,
}: {
  initialDraft: FearlessDraftSnapshot;
}) {
  const room = buildBot3SeasonLobbySnapshot(initialDraft);
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

      <section className="season-room-start-controls">
        <div>
          <span>Автоматический режим</span>
          <strong>Боты готовы и уже выбрали капитанов</strong>
          <p>Все решения ботов подтверждаются сразу, без ожидания таймера.</p>
        </div>
        <div><span><FiZap aria-hidden="true" /> Bot3 активен</span></div>
      </section>

      <section className="season-room-draft">
        <p className="season-room-draft-perspective">
          Ваша команда участвует в драфте от лица капитана:{" "}
          <strong>{captain?.nickname ?? initialDraft.user.name}</strong>
        </p>
        <FearlessDraftScreen
          initialSnapshot={initialDraft}
          lobbyPlayers={initialDraft.lobbyPlayers}
        />
      </section>
    </main>
  );
}

