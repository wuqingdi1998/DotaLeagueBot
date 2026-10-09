import type { DraftLobbyPlayer, DraftSeriesSnapshot, FearlessDraftSnapshot } from "./snapshot";
import type { SeasonLobbyRoomSnapshot } from
  "@/app/season-lobby/[matchId]/model/types";

export function buildBot3SeasonLobbySnapshot(
  draft: FearlessDraftSnapshot,
): SeasonLobbyRoomSnapshot {
  const lobbyPlayers = draft.lobbyPlayers ?? [];
  if (draft.bot3Room) return draft.bot3Room;
  if (lobbyPlayers.length !== 10 || !draft.series?.isSeasonLobbyPreview) {
    throw new Error("Bot3 требует активное сезонное тестовое лобби");
  }
  return { ...buildBot3Room(lobbyPlayers, draft.user.id, draft.series.id, draft.serverNow,
    draft.isOrganizer, draft.series.status === "MAP_COMPLETE"), currentGameNumber: draft.series.currentMap };
}

export function displayBot3Captains(series: DraftSeriesSnapshot, room?: SeasonLobbyRoomSnapshot): DraftSeriesSnapshot {
  if (!room || room.status.startsWith("captain_")) return series;
  const teamA = room.players.find((player) => player.teamSide === "a" && player.isCaptain);
  const teamB = room.players.find((player) => player.teamSide === "b" && player.isCaptain);
  return { ...series,
    player1: { ...series.player1, name: teamA?.nickname ?? series.player1.name, avatarUrl: teamA?.avatarUrl ?? series.player1.avatarUrl },
    player2: { ...series.player2, name: teamB?.nickname ?? series.player2.name, avatarUrl: teamB?.avatarUrl ?? series.player2.avatarUrl },
  };
}

export function buildBot3Room(lobbyPlayers: DraftLobbyPlayer[], viewerId: string,
  seriesId: number, serverNow: string, isOrganizer = false, isBetweenMaps = false): SeasonLobbyRoomSnapshot {
  const captains = lobbyPlayers.filter((player) => player.isCaptain);
  return {
    serverNow,
    matchId: 0,
    tournamentSlug: "fearless-draft",
    roundNumber: 1,
    lobbyName: "Bot3 · Тест сезонной лиги",
    teamAName: "Команда A",
    teamBName: "Команда B",
    bestOf: 3,
    gameFormat: "Fearless Draft",
    usesFearlessDraft: true,
    status: isBetweenMaps ? "break" : "drafting",
    currentUserId: viewerId,
    currentUserTeamSide: "a",
    isOrganizer,
    hostPlayerId: viewerId,
    isHost: true,
    isForceStarted: false,
    allPlayersOnline: true,
    players: lobbyPlayers.map((player) => ({
      playerId: player.id,
      dotaId: player.dotaId,
      nickname: player.name,
      serverName: player.serverName ?? player.name,
      avatarUrl: player.avatarUrl,
      subscriptionRole: null,
      teamSide: player.teamSide,
      tier: player.tier ?? null,
      positions: player.positions ?? null,
      slotNumber: player.slotNumber ?? null,
      isCaptain: Boolean(player.isCaptain),
      isHost: player.id === viewerId,
      isOnline: true,
      hasAnsweredCaptainInterest: true,
      wantsCaptain: Boolean(player.isCaptain),
      hasVoted: true,
    })),
    messages: [],
    captainStageDeadlineAt: null,
    captainRevealNextStatus: null,
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
    ownVoteCandidateId: viewerId,
    teamVoteCount: 5,
    teamPlayerCount: 5,
    draftSeriesId: seriesId,
    currentGameNumber: 1,
  };
}
