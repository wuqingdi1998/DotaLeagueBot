export type SeasonLobbyRoomStatus =
  | "waiting"
  | "voting"
  | "drafting"
  | "playing"
  | "break"
  | "completed";

export type SeasonLobbyRoomPlayer = {
  playerId: string;
  dotaId: string;
  nickname: string;
  serverName: string;
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
  currentUserTeamSide: "a" | "b" | null;
  isOrganizer: boolean;
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
  currentGameNumber: number | null;
};

export type SeasonLobbyRoomCommand =
  | { action: "SEND_MESSAGE"; message: string }
  | { action: "START_VOTING"; force: boolean }
  | {
      action: "START_WITH_CAPTAINS";
      teamACaptainId: string;
      teamBCaptainId: string;
      force: boolean;
    }
  | { action: "VOTE_CAPTAIN"; candidatePlayerId: string }
  | { action: "TRANSFER_CAPTAIN"; newCaptainPlayerId: string }
  | {
      action: "SET_CAPTAIN";
      teamSide: "a" | "b";
      newCaptainPlayerId: string;
    }
  | {
      action: "REPORT_GAME_RESULT";
      dotaMatchId: string;
      winnerSide: "a" | "b";
    };
