"use client";

import Link from "next/link";
import { FiActivity, FiArrowLeft, FiShield } from "react-icons/fi";
import { MatchRoomChat } from "@/app/components/MatchRoomChat";
import { MatchResultControl } from "./components/MatchResultControl";
import { useMatchRoom } from "./hooks/useMatchRoom";
import type { MatchRoomSnapshot } from "./model/types";

function TeamCard({ side, snapshot }: { side: "a" | "b"; snapshot: MatchRoomSnapshot }) {
  const name = side === "a" ? snapshot.teamAName : snapshot.teamBName;
  const captain = side === "a" ? snapshot.teamACaptainName : snapshot.teamBCaptainName;
  const score = side === "a" ? snapshot.teamAScore : snapshot.teamBScore;
  return (
    <article className={`ordinary-room-team side-${side}`}>
      <span>Команда {side.toUpperCase()}</span>
      <strong>{name}</strong>
      <p>Капитан: {captain}</p>
      <b>{score}</b>
    </article>
  );
}

export function MatchRoomScreen({ initialSnapshot }: { initialSnapshot: MatchRoomSnapshot }) {
  const { snapshot, error, isSending, isConnected, send } = useMatchRoom(initialSnapshot);
  const tournamentUrl = `/tournaments/${snapshot.tournamentSlug}`;
  return (
    <main className="season-room-page ordinary-room-page">
      <header className="season-room-hero">
        <div>
          <Link href={tournamentUrl}><FiArrowLeft aria-hidden="true" /> Вернуться к турниру</Link>
          <span>{snapshot.stage} · BO{snapshot.bestOf}</span>
          <h1>{snapshot.teamAName} — {snapshot.teamBName}</h1>
          <p>{snapshot.tournamentName}</p>
        </div>
        <div className={`season-room-connection ${isConnected ? "online" : "reconnecting"}`}>
          {isConnected ? <FiActivity /> : <FiShield />}
          {isConnected ? "Синхронизация включена" : "Переподключение…"}
        </div>
      </header>
      {error && <div className="season-room-error" role="alert">{error}</div>}
      <div className="season-room-overview ordinary-room-overview">
        <section className="ordinary-room-match-card">
          <div className="ordinary-room-teams">
            <TeamCard side="a" snapshot={snapshot} />
            <span className="ordinary-room-versus">:</span>
            <TeamCard side="b" snapshot={snapshot} />
          </div>
          {!!snapshot.games.length && (
            <ol className="ordinary-room-map-history">
              {snapshot.games.map((game) => (
                <li key={game.gameNumber}>
                  <span>Карта {game.gameNumber}</span>
                  <strong>{game.winnerSide === "a" ? snapshot.teamAName : snapshot.teamBName}</strong>
                  <small>ID {game.dotaMatchId}</small>
                </li>
              ))}
            </ol>
          )}
        </section>
        <MatchRoomChat
          currentUserId={snapshot.currentUserId}
          messages={snapshot.messages}
          isSending={isSending}
          sendMessage={(message) => send({ action: "SEND_MESSAGE", message })}
        />
      </div>
      <MatchResultControl snapshot={snapshot} isSending={isSending} send={send} />
    </main>
  );
}
