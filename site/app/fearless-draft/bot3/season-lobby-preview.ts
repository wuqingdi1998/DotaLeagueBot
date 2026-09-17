import type { FearlessDraftSnapshot } from "../model/snapshot";
import type { SeasonLobbyRoomSnapshot } from
  "@/app/season-lobby/[matchId]/model/types";

export function buildBot3SeasonLobbySnapshot(
  draft: FearlessDraftSnapshot,
): SeasonLobbyRoomSnapshot {
  const lobbyPlayers = draft.lobbyPlayers ?? [];
  if (lobbyPlayers.length !== 10 || !draft.series?.isSeasonLobbyPreview) {
    throw new Error("Bot3 требует активное сезонное тестовое лобби");
  }
  const captains = lobbyPlayers.filter((player) => player.isCaptain);
  return {
    serverNow: draft.serverNow,
    matchId: 0,
    tournamentSlug: "fearless-draft",
    roundNumber: 1,
    lobbyName: "Bot3 · Тест сезонной лиги",
    teamAName: "Команда A",
    teamBName: "Команда B",
    bestOf: 3,
    gameFormat: "Fearless Draft",
    usesFearlessDraft: true,
    status: draft.series.status === "MAP_COMPLETE" ? "break" : "drafting",
    currentUserId: draft.user.id,
    currentUserTeamSide: "a",
    isOrganizer: draft.isOrganizer,
    hostPlayerId: draft.user.id,
    isHost: true,
    isForceStarted: false,
    allPlayersOnline: true,
    players: lobbyPlayers.map((player) => ({
      playerId: player.id,
      dotaId: player.dotaId,
      nickname: player.name,
      serverName: player.serverName ?? player.name,
      avatarUrl: player.avatarUrl,
      teamSide: player.teamSide,
      tier: null,
      slotNumber: player.slotNumber ?? null,
      isCaptain: Boolean(player.isCaptain),
      isHost: player.id === draft.user.id,
      isOnline: true,
      hasAnsweredCaptainInterest: true,
      wantsCaptain: Boolean(player.isCaptain),
      hasVoted: true,
    })),
    messages: [],
    captainStageDeadlineAt: null,
    ownCaptainInterest: true,
    captainCandidateIds: captains.map((captain) => captain.id),
    captainBallots: lobbyPlayers.map((player) => ({
      voterPlayerId: player.id,
      candidatePlayerId: captains.find(
        (captain) => captain.teamSide === player.teamSide,
      )?.id ?? player.id,
      isAutomatic: true,
    })),
    captainTiebreak: null,
    ownVoteCandidateId: draft.user.id,
    teamVoteCount: 5,
    teamPlayerCount: 5,
    draftSeriesId: draft.series.id,
    currentGameNumber: draft.series.currentMap,
  };
}
