import {
  automaticCaptainBallots, resolveCaptainSelection, resolveCaptainTiebreak,
  SEASON_CAPTAIN_STAGE_SECONDS, SEASON_CAPTAIN_REVEAL_SECONDS,
} from "@/app/season-lobby/[matchId]/model/captain-selection";
import type { SeasonLobbyRoomSnapshot } from "@/app/season-lobby/[matchId]/model/types";
import { randomBotDueAt } from "./bot-timing";

export type Bot3CaptainState = {
  room: SeasonLobbyRoomSnapshot;
  dueAt: Record<string, number>;
  tiebreaks: Partial<Record<"a" | "b", NonNullable<SeasonLobbyRoomSnapshot["captainTiebreak"]>>>;
};

function deadline(room: SeasonLobbyRoomSnapshot, now: number, seconds: number) {
  room.captainStageDeadlineAt = new Date(now + seconds * 1_000).toISOString();
}

function schedule(state: Bot3CaptainState, ids: string[], now: number, random: () => number) {
  state.dueAt = Object.fromEntries(ids.filter((id) => id !== state.room.currentUserId)
    .map((id) => [id, randomBotDueAt(now, Date.parse(state.room.captainStageDeadlineAt!), random)]));
}

export function startBot3CaptainSelection(room: SeasonLobbyRoomSnapshot, now: number, random: () => number): Bot3CaptainState {
  const state: Bot3CaptainState = { room: structuredClone(room), dueAt: {}, tiebreaks: {} };
  state.room.status = "captain_interest";
  state.room.players.forEach((player) => {
    player.isCaptain = false;
    player.hasAnsweredCaptainInterest = false;
    player.wantsCaptain = null;
    player.hasVoted = false;
  });
  state.room.ownCaptainInterest = null;
  state.room.ownVoteCandidateId = null;
  state.room.captainCandidateIds = [];
  state.room.captainBallots = [];
  deadline(state.room, now, SEASON_CAPTAIN_STAGE_SECONDS);
  schedule(state, state.room.players.map((player) => player.playerId), now, random);
  return state;
}

function refreshViewer(state: Bot3CaptainState) {
  const room = state.room;
  const own = room.players.find((player) => player.playerId === room.currentUserId)!;
  room.ownCaptainInterest = own.wantsCaptain;
  room.ownVoteCandidateId = room.captainBallots.find((vote) => vote.voterPlayerId === own.playerId)?.candidatePlayerId ?? null;
  room.teamVoteCount = room.players.filter((player) => player.teamSide === "a" && player.hasVoted).length;
  room.captainTiebreak = room.status === "captain_voting" ? null : state.tiebreaks.a ?? null;
}

function reveal(state: Bot3CaptainState, now: number) {
  state.room.status = "captain_reveal";
  state.room.captainRevealNextStatus = Object.values(state.tiebreaks).some((tie) => !tie.hasResponded) ? "captain_tiebreak" : "drafting";
  deadline(state.room, now, SEASON_CAPTAIN_REVEAL_SECONDS);
  state.dueAt = {};
}

export function advanceBot3Captains(state: Bot3CaptainState, now: number, random: () => number): boolean {
  const before = JSON.stringify(state);
  const room = state.room;
  let expired = now >= Date.parse(room.captainStageDeadlineAt ?? "");
  const randomIndex = (length: number) => Math.min(length - 1, Math.floor(random() * length));
  if (room.status === "captain_interest") {
    for (const player of room.players) {
      if (player.hasAnsweredCaptainInterest) continue;
      if (player.playerId !== room.currentUserId && now >= state.dueAt[player.playerId]) {
        player.wantsCaptain = random() < 0.55;
        player.hasAnsweredCaptainInterest = true;
        delete state.dueAt[player.playerId];
      } else if (expired) {
        player.wantsCaptain = false;
        player.hasAnsweredCaptainInterest = true;
      }
    }
    if (room.players.every((player) => player.hasAnsweredCaptainInterest)) {
      room.captainCandidateIds = room.players.filter((player) => player.wantsCaptain).map((player) => player.playerId);
      room.captainBallots = automaticCaptainBallots(room.players.map((player) => ({ ...player, wantsCaptain: Boolean(player.wantsCaptain) })));
      room.status = "captain_voting";
      expired = false;
      deadline(room, now, SEASON_CAPTAIN_STAGE_SECONDS);
      for (const player of room.players) player.hasVoted = Boolean(player.wantsCaptain);
      schedule(state, room.players.filter((player) => !player.hasVoted).map((player) => player.playerId), now, random);
    }
  }
  if (room.status === "captain_voting") {
    for (const side of ["a", "b"] as const) {
      const team = room.players.filter((player) => player.teamSide === side);
      if (team.some((player) => player.isCaptain) || state.tiebreaks[side]) continue;
      const candidates = team.filter((player) => player.wantsCaptain);
      if (candidates.length > 1) {
        for (const player of team.filter((player) => !player.hasVoted)) {
          if (player.playerId !== room.currentUserId && now >= state.dueAt[player.playerId]) {
            room.captainBallots.push({ voterPlayerId: player.playerId, candidatePlayerId: candidates[randomIndex(candidates.length)].playerId, isAutomatic: false });
            player.hasVoted = true;
            delete state.dueAt[player.playerId];
          }
        }
        if (!expired && team.some((player) => !player.hasVoted)) continue;
      }
      const result = resolveCaptainSelection(team.map((player) => ({ ...player, wantsCaptain: Boolean(player.wantsCaptain) })), room.captainBallots.filter((vote) => team.some((player) => player.playerId === vote.voterPlayerId)), randomIndex);
      for (const player of team) delete state.dueAt[player.playerId];
      if (result.kind === "captain") team.find((player) => player.playerId === result.captainPlayerId)!.isCaptain = true;
      else state.tiebreaks[side] = { voterPlayerId: result.voterPlayerId, candidatePlayerIds: result.candidatePlayerIds, selectedCandidateId: null, hasResponded: false };
    }
    if (["a", "b"].every((side) => room.players.some((player) => player.teamSide === side && player.isCaptain) || state.tiebreaks[side as "a" | "b"])) reveal(state, now);
  } else if (room.status === "captain_reveal" && expired) {
    room.status = room.captainRevealNextStatus ?? "drafting";
    if (room.status === "captain_tiebreak") {
      deadline(room, now, SEASON_CAPTAIN_STAGE_SECONDS);
      schedule(state, Object.values(state.tiebreaks).map((tie) => tie.voterPlayerId), now, random);
    } else room.captainStageDeadlineAt = null;
  } else if (room.status === "captain_tiebreak") {
    for (const [side, tie] of Object.entries(state.tiebreaks)) {
      if (room.players.some((player) => player.teamSide === side && player.isCaptain)) continue;
      if (!tie.hasResponded && tie.voterPlayerId !== room.currentUserId && now >= state.dueAt[tie.voterPlayerId]) {
        tie.selectedCandidateId = tie.candidatePlayerIds[randomIndex(2)];
        tie.hasResponded = true;
      }
      if (!tie.hasResponded && !expired) continue;
      const captain = resolveCaptainTiebreak(room.players.filter((player) => tie.candidatePlayerIds.includes(player.playerId)), tie.selectedCandidateId, randomIndex);
      room.players.find((player) => player.playerId === captain)!.isCaptain = true;
      delete state.dueAt[tie.voterPlayerId];
      if (room.players.some((player) => player.teamSide === side && player.isCaptain)) tie.hasResponded = true;
    }
    if (room.players.filter((player) => player.isCaptain).length === 2) {
      reveal(state, now);
    }
  }
  refreshViewer(state);
  return JSON.stringify(state) !== before;
}

export function answerBot3Captain(state: Bot3CaptainState, action: string, value: boolean | string): void {
  const room = state.room;
  const own = room.players.find((player) => player.playerId === room.currentUserId)!;
  if (action === "BOT3_CAPTAIN_INTEREST" && room.status === "captain_interest" && !own.hasAnsweredCaptainInterest && typeof value === "boolean") {
    own.wantsCaptain = value;
    own.hasAnsweredCaptainInterest = true;
  } else if (action === "BOT3_CAPTAIN_VOTE" && room.status === "captain_voting" && own.wantsCaptain === false && !own.hasVoted && typeof value === "string" && room.players.some((player) => player.teamSide === own.teamSide && player.playerId === value && player.wantsCaptain)) {
    own.hasVoted = true;
    room.captainBallots.push({ voterPlayerId: own.playerId, candidatePlayerId: value, isAutomatic: false });
  } else if (action === "BOT3_CAPTAIN_TIEBREAK" && room.status === "captain_tiebreak" && room.captainTiebreak?.voterPlayerId === own.playerId && !room.captainTiebreak.hasResponded && typeof value === "string" && room.captainTiebreak.candidatePlayerIds.includes(value)) {
    state.tiebreaks.a!.selectedCandidateId = value;
    state.tiebreaks.a!.hasResponded = true;
  } else throw new Error("Сейчас этот ответ недоступен или уже сохранён");
  refreshViewer(state);
}
