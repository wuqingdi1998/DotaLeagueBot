import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CaptainVoting } from "./CaptainVoting";
import { LobbyPlayerTeams } from "./LobbyPlayerTeams";
import type { SeasonLobbyRoomSnapshot } from "../model/types";

const players = Array.from({ length: 10 }, (_, index) => ({
  playerId: String(index), dotaId: String(index + 100), nickname: `Участник ${index + 1}`,
  serverName: `Участник ${index + 1}`, avatarUrl: null, subscriptionRole: null,
  teamSide: index < 5 ? "a" as const : "b" as const, tier: 5, positions: "3/4",
  slotNumber: index % 5 + 1, isCaptain: false, isHost: index === 0, isOnline: true,
  hasAnsweredCaptainInterest: index < 2, wantsCaptain: index === 1,
  hasVoted: false,
}));
const snapshot: SeasonLobbyRoomSnapshot = {
  serverNow: "2026-10-09T12:00:00Z", matchId: 1, tournamentSlug: "league",
  roundNumber: 1, lobbyName: "Лобби", teamAName: "Команда А", teamBName: "Команда Б",
  bestOf: 2, gameFormat: "captains_mode", usesFearlessDraft: true,
  status: "captain_interest", currentUserId: "0", currentUserTeamSide: "a",
  isOrganizer: false, hostPlayerId: "0", isHost: true, isForceStarted: false,
  allPlayersOnline: true, players, messages: [],
  captainStageDeadlineAt: "2026-10-09T12:03:00Z", captainRevealNextStatus: null,
  ownCaptainInterest: null, captainCandidateIds: ["1", "2"], captainBallots: [],
  captainTiebreak: null, ownVoteCandidateId: null, teamVoteCount: 0,
  teamPlayerCount: 5, draftSeriesId: null, currentGameNumber: null,
};
const send = async () => true;

it("replaces consent buttons with the saved captain intention, including after reload", () => {
  const html = renderToStaticMarkup(<CaptainVoting snapshot={{ ...snapshot, ownCaptainInterest: true }} isSending={false} send={send} />);
  expect(html).toContain("Вы хотите быть капитаном</strong>");
  expect(html).not.toContain("<button");
  const unanswered = renderToStaticMarkup(<CaptainVoting snapshot={snapshot} isSending={false} send={send} />);
  expect(unanswered).toContain("Да, хочу");
  expect(unanswered).toContain("Нет</button>");
});

it("clearly announces captain selection and displays every player's positions", () => {
  const choice = { ...snapshot, status: "captain_voting" as const, ownCaptainInterest: false };
  const html = renderToStaticMarkup(<CaptainVoting snapshot={choice} isSending={false} send={send} />);
  expect(html).toContain("Вы выбираете капитана");
  const teams = renderToStaticMarkup(<LobbyPlayerTeams snapshot={snapshot} />);
  expect(teams.match(/aria-label="Игровые позиции: 3\/4"/g)).toHaveLength(10);
});

it("renders lobby visual scenarios for desktop and phone checks", () => {
  const directory = new URL("../../../../.data/season-lobby-layout/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const styles = new URL("../../../styles/", import.meta.url);
  const css = ["01-foundation.css", "60-season-lobby-entry-and-shell.css", "60-season-lobby-room.css", "60-season-captain-voting.css"]
    .map((name) => readFileSync(new URL(name, styles), "utf8")).join("\n") +
    readFileSync(new URL("../../../components/PlayerRoleBadge.module.css", import.meta.url), "utf8").replaceAll(".badge", '[aria-label^="Игровые позиции"]');
  for (const [name, state] of Object.entries({ open: snapshot, accepted: { ...snapshot, ownCaptainInterest: true }, voting: { ...snapshot, status: "captain_voting" as const, ownCaptainInterest: false } })) {
    const html = renderToStaticMarkup(<><CaptainVoting snapshot={state} isSending={false} send={send} /><LobbyPlayerTeams snapshot={state} /></>);
    writeFileSync(new URL(`${name}.html`, directory), `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="site-shell" data-theme="dark"><main class="season-room-page">${html}</main></div>`);
  }
});
