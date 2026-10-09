import { describe, expect, it } from "vitest";
import { buildBot3Room } from "./bot3-room";
import { startBot3CaptainSelection, advanceBot3Captains, answerBot3Captain } from "./bot3-captains";
import { randomBotDueAt } from "./bot-timing";

const now = Date.parse("2026-10-09T12:00:00Z");
const players = Array.from({ length: 10 }, (_, index) => ({
  id: String(index), dotaId: String(index + 100), name: `Игрок ${index + 1}`,
  avatarUrl: null, teamSide: index < 5 ? "a" as const : "b" as const,
  isOnline: true, tier: index + 1, positions: "3/4", isCaptain: false,
}));
function initial() {
  return startBot3CaptainSelection(buildBot3Room(players, "0", 1, new Date(now).toISOString()), now, () => 0.5);
}
describe("Bot3 captain simulation", () => {
  it("gives every bot its own nonzero delay strictly within the stage", () => {
    let sample = 0;
    const state = startBot3CaptainSelection(buildBot3Room(players, "0", 1, new Date(now).toISOString()), now, () => (sample++ + 1) / 10);
    expect(new Set(Object.values(state.dueAt)).size).toBe(9);
    expect(Object.values(state.dueAt).every((due) => due > now && due < now + 60_000)).toBe(true);
    expect(state.dueAt["0"]).toBeUndefined();
    advanceBot3Captains(state, now + 1_000, () => 0.5);
    expect(state.room.players.some((player) => player.hasAnsweredCaptainInterest)).toBe(false);
  });

  it("preserves consent after reload and rejects changing a saved answer", () => {
    const state = initial();
    answerBot3Captain(state, "BOT3_CAPTAIN_INTEREST", true);
    const restored = JSON.parse(JSON.stringify(state));
    expect(restored.room.ownCaptainInterest).toBe(true);
    expect(() => answerBot3Captain(restored, "BOT3_CAPTAIN_INTEREST", false)).toThrow();
  });

  it("starts a full voting window even if interest expired; uses shared captain rules", () => {
    const state = initial();
    advanceBot3Captains(state, now + 60_000, () => 0.1);
    expect(state.room.ownCaptainInterest).toBe(false);
    expect(state.room.status).toBe("captain_voting");
    expect(state.room.captainStageDeadlineAt).toBe(new Date(now + 120_000).toISOString());
    answerBot3Captain(state, "BOT3_CAPTAIN_VOTE", "1");
    advanceBot3Captains(state, now + 61_000, () => 0.5);
    expect(state.room.status).toBe("captain_reveal");
    expect(state.room.players.filter((player) => player.isCaptain).map((player) => player.playerId)).toEqual(["1", "9"]);
    advanceBot3Captains(state, now + 71_000, () => 0.5);
    expect(state.room.status).toBe("drafting");
    expect(state.dueAt).toEqual({});
  });

  it("persists the human decisive vote even when JSON no longer shares object references", () => {
    const state = initial();
    state.room.status = "captain_tiebreak";
    state.tiebreaks.a = { voterPlayerId: "0", candidatePlayerIds: ["1", "2"], selectedCandidateId: null, hasResponded: false };
    state.room.captainTiebreak = structuredClone(state.tiebreaks.a);
    const restored = JSON.parse(JSON.stringify(state));
    answerBot3Captain(restored, "BOT3_CAPTAIN_TIEBREAK", "2");
    expect(restored.tiebreaks.a.selectedCandidateId).toBe("2");
    expect(restored.room.captainTiebreak.hasResponded).toBe(true);
    expect(() => answerBot3Captain(restored, "BOT3_CAPTAIN_TIEBREAK", "1")).toThrow();
  });

  it("does not accept opponents, non-candidates or votes in the wrong stage", () => {
    const state = initial();
    expect(() => answerBot3Captain(state, "BOT3_CAPTAIN_VOTE", "1")).toThrow();
    answerBot3Captain(state, "BOT3_CAPTAIN_INTEREST", false);
    advanceBot3Captains(state, now + 30_000, () => 0.1);
    expect(() => answerBot3Captain(state, "BOT3_CAPTAIN_VOTE", "5")).toThrow();
    expect(() => answerBot3Captain(state, "BOT3_CAPTAIN_VOTE", "missing")).toThrow();
  });

  it("runs the league's special tie through reveal, decisive voting and draft", () => {
    const state = initial();
    state.room.status = "captain_voting";
    state.room.players.forEach((player, index) => {
      player.wantsCaptain = index < 3;
      player.hasVoted = true;
      player.isCaptain = index === 5;
    });
    state.room.captainCandidateIds = ["0", "1", "2"];
    state.room.captainBallots = [
      ...["0", "1", "2"].map((id) => ({ voterPlayerId: id, candidatePlayerId: id, isAutomatic: true })),
      { voterPlayerId: "3", candidatePlayerId: "1", isAutomatic: false },
      { voterPlayerId: "4", candidatePlayerId: "2", isAutomatic: false },
    ];
    advanceBot3Captains(state, now, () => 0.5);
    expect(state.room.captainRevealNextStatus).toBe("captain_tiebreak");
    advanceBot3Captains(state, now + 10_000, () => 0.5);
    expect(state.room.status).toBe("captain_tiebreak");
    answerBot3Captain(state, "BOT3_CAPTAIN_TIEBREAK", "2");
    advanceBot3Captains(state, now + 11_000, () => 0.5);
    expect(state.room.captainRevealNextStatus).toBe("drafting");
    advanceBot3Captains(state, now + 21_000, () => 0.5);
    expect(state.room.status).toBe("drafting");
    expect(state.room.players.filter((player) => player.isCaptain).map((player) => player.playerId)).toEqual(["2", "5"]);
  });

  it("bounds all randomized decisions, including nearly expired turns", () => {
    expect(randomBotDueAt(now, now + 15_000, () => 0)).toBe(now + 2_000);
    expect(randomBotDueAt(now, now + 15_000, () => 1)).toBe(now + 13_000);
    expect(randomBotDueAt(now, now + 500, () => 1)).toBe(now);
  });
});
