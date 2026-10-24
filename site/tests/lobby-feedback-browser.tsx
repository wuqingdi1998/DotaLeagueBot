import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CaptainVoting } from "@/app/season-lobby/[matchId]/components/CaptainVoting";
import type { SeasonLobbyRoomCommand } from "@/app/season-lobby/[matchId]/model/types";
import { buildBot3Room } from "@/app/fearless-draft/model/bot3-room";
import { HeroGrid } from "@/app/fearless-draft/components/HeroGrid";
import { DraftLocaleProvider } from "@/app/fearless-draft/hooks/useDraftLocale";
import type { DraftMapSnapshot, FearlessDraftCommand } from "@/app/fearless-draft/model/snapshot";

const mode = new URLSearchParams(location.search).get("mode") ?? "interest";
const now = new Date().toISOString();
const room = buildBot3Room(Array.from({ length: 10 }, (_, index) => ({
  id: String(index), dotaId: String(index + 100), name: `Участник ${index + 1}`,
  avatarUrl: null, teamSide: index < 5 ? "a" : "b", isCaptain: false, isOnline: true, tier: 4, positions: "3/4",
})), "0", 1, now);
room.status = mode === "reveal" ? "captain_reveal" : "captain_interest";
room.captainRevealNextStatus = "drafting";
room.captainStageDeadlineAt = new Date(Date.now() + 60_000).toISOString();
room.ownCaptainInterest = mode === "saved" || mode === "all" ? false : null;
room.players.forEach((player) => {
  player.hasAnsweredCaptainInterest = mode === "all" || player.teamSide === "a" &&
    (player.playerId !== "0" || room.ownCaptainInterest !== null);
  player.wantsCaptain = player.hasAnsweredCaptainInterest ? false : null;
  player.hasVoted = false;
});
const map: DraftMapSnapshot = {
  id: 1, number: 1, status: "DRAFTING", coinTossWinnerId: "0", coinTossSegment: 1,
  firstChooserId: "0", firstChoice: null, secondChoice: null, radiantPlayerId: "0",
  firstPickPlayerId: "0", currentStep: 0, version: 1, currentActorId: "0",
  currentAction: mode === "PICK" ? "PICK" : "BAN", currentPhase: null,
  baseDurationSeconds: 30, stepStartedAt: now, finalPickReviewEndsAt: null,
  player1ReserveSeconds: 130, player2ReserveSeconds: 130, previewHeroId: null,
  actions: [], heroSuggestions: [], lineupAssignment: null, unavailableHeroIds: [], createdAt: now,
};

function FeedbackFixture() {
  const [snapshot, setSnapshot] = useState(room);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [requestCount, setRequestCount] = useState(0);
  const responseRef = useRef<((success: boolean) => void) | null>(null);
  const commandRef = useRef<SeasonLobbyRoomCommand | FearlessDraftCommand | null>(null);
  const isHero = mode === "BAN" || mode === "PICK";
  function send(command: SeasonLobbyRoomCommand | FearlessDraftCommand): Promise<boolean> {
    if (command.action === "HIGHLIGHT_HERO") return Promise.resolve(true);
    setRequestCount((count) => count + 1);
    setError("");
    setIsSending(true);
    commandRef.current = command;
    return new Promise((resolve) => { responseRef.current = resolve; });
  }
  function respond(success: boolean) {
    if (!responseRef.current) return;
    if (success && commandRef.current?.action === "ANSWER_CAPTAIN_INTEREST") {
      const answer = commandRef.current.wantsCaptain;
      setSnapshot((current) => ({ ...current, ownCaptainInterest: answer,
        players: current.players.map((player) => player.playerId === "0"
          ? { ...player, wantsCaptain: answer, hasAnsweredCaptainInterest: true } : player),
      }));
    }
    if (!success) setError("Не удалось сохранить. Повторите действие.");
    responseRef.current(success);
    responseRef.current = null;
    setIsSending(false);
  }
  return (
    <>
      <aside aria-label="Управление проверкой">
        <button onClick={() => respond(true)}>Сервер: успешно</button>
        <button onClick={() => respond(false)}>Сервер: ошибка</button>
        <output data-testid="requests">{requestCount}</output>
      </aside>
      <main className={isHero ? "fearless-draft-page" : "season-room-page"}>
        {error && <p role="alert">{error}</p>}
        {isHero ? <div className="fearless-draft-stage"><DraftLocaleProvider>
          <HeroGrid map={map} userId="0" serverNow={now} canSuggest={false}
            isSending={isSending} send={send} onPreviewHeroIdChange={() => undefined} />
        </DraftLocaleProvider></div> : <CaptainVoting snapshot={snapshot} isSending={isSending} send={send} />}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<FeedbackFixture />);
