export type SeasonLobbyRoomStatus = "waiting" | "voting" | "drafting";

export type SeasonLobbyRoomPlayer = {
  playerId: string;
  dotaId: string;
  nickname: string;
  avatarUrl: string | null;
  teamSide: "a" | "b";
  tier: number | null;
  slotNumber: number | null;
  isCaptain: boolean;
  isHost: boolean;
  isOnline: boolean;
  hasVoted: boolean;
};

export type SeasonLobbyRoomMessage = {
  id: number;
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  message: string;
  createdAt: string;
};

export type SeasonLobbyRoomSnapshot = {
  serverNow: string;
  matchId: number;
  tournamentSlug: string;
  roundNumber: number;
  lobbyName: string;
  teamAName: string;
  teamBName: string;
  bestOf: number;
  status: SeasonLobbyRoomStatus;
  currentUserId: string;
  currentUserTeamSide: "a" | "b";
  hostPlayerId: string | null;
  isHost: boolean;
  isForceStarted: boolean;
  allPlayersOnline: boolean;
  players: SeasonLobbyRoomPlayer[];
  messages: SeasonLobbyRoomMessage[];
  ownVoteCandidateId: string | null;
  teamVoteCount: number;
  teamPlayerCount: number;
  draftSeriesId: number | null;
};

export type SeasonLobbyRoomCommand =
  | { action: "SEND_MESSAGE"; message: string }
  | { action: "START_VOTING"; force: boolean }
  | { action: "VOTE_CAPTAIN"; candidatePlayerId: string }
  | { action: "TRANSFER_CAPTAIN"; newCaptainPlayerId: string };
