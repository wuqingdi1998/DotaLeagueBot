import { describe, expect, it } from "vitest";
import { buildBot3Room } from "@/app/fearless-draft/model/bot3-room";
import { captainWaitingMessage } from "./captain-waiting";
import type { SeasonLobbyRoomSnapshot } from "./types";

function room(status: SeasonLobbyRoomSnapshot["status"] = "captain_interest") {
  const snapshot = buildBot3Room([], "0", 1, "2026-10-24T10:00:00Z");
  snapshot.status = status;
  snapshot.ownCaptainInterest = false;
  snapshot.players = Array.from({ length: 10 }, (_, index) => ({
    playerId: String(index), dotaId: String(index + 100), nickname: `Игрок ${index}`,
    serverName: `Игрок ${index}`, avatarUrl: null, subscriptionRole: null,
    teamSide: index < 5 ? "a" : "b", tier: 1, positions: "1", slotNumber: index % 5 + 1,
    isCaptain: false, isHost: false, isOnline: true, hasAnsweredCaptainInterest: index < 5,
    wantsCaptain: index === 1 || index === 2 || index === 6 || index === 7,
    hasVoted: index < 5 || index === 6 || index === 7,
  }));
  return snapshot;
}

describe("captain stage waiting", () => {
  it("distinguishes own answers, opponent answers and all answers", () => {
    const snapshot = room();
    expect(captainWaitingMessage(snapshot)).toBe("Оппонент делает выбор");
    snapshot.players[4].hasAnsweredCaptainInterest = false;
    expect(captainWaitingMessage(snapshot)).toContain("вашей команды");
    snapshot.players.forEach((player) => { player.hasAnsweredCaptainInterest = true; });
    expect(captainWaitingMessage(snapshot)).toContain("Переходим к следующему этапу");
  });

  it("includes the just-saved own answer while the next snapshot is still arriving", () => {
    const snapshot = room();
    snapshot.ownCaptainInterest = null;
    snapshot.players[0].hasAnsweredCaptainInterest = false;
    expect(captainWaitingMessage(snapshot)).toContain("вашей команды");
    expect(captainWaitingMessage(snapshot, true)).toBe("Оппонент делает выбор");
  });

  it("waits only for missing eligible votes, not automatic candidate self-votes", () => {
    const snapshot = room("captain_voting");
    expect(captainWaitingMessage(snapshot)).toBe("Оппонент делает выбор");
    snapshot.players[8].hasVoted = true;
    snapshot.players[9].hasVoted = true;
    snapshot.players[5].hasVoted = true;
    expect(captainWaitingMessage(snapshot)).toContain("Переходим к итогам");
    snapshot.players[4].hasVoted = false;
    expect(captainWaitingMessage(snapshot)).toContain("голоса вашей команды");
  });

  it("announces opponent choice after the own decisive vote, and never during reveal", () => {
    const snapshot = room("captain_tiebreak");
    snapshot.captainTiebreak = { voterPlayerId: "0", candidatePlayerIds: ["1", "2"], selectedCandidateId: null, hasResponded: false };
    expect(captainWaitingMessage(snapshot)).toContain("решающий голос вашей команды");
    snapshot.captainTiebreak.hasResponded = true;
    expect(captainWaitingMessage(snapshot)).toBe("Оппонент делает выбор");
    snapshot.status = "captain_reveal";
    expect(captainWaitingMessage(snapshot)).toContain("Показываем итоги");
  });
});
