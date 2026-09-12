import type { WinnerSide } from "./series";

export type MatchRoomStatus = "active" | "disputed" | "completed";
export type MatchRoomMessage = {
  id: number;
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  message: string;
  createdAt: string;
};
export type MatchRoomReport = {
  captainId: string;
  captainName: string;
  dotaMatchId: string;
  winnerSide: WinnerSide;
};
export type MatchRoomGame = {
  gameNumber: number;
  dotaMatchId: string;
  winnerSide: WinnerSide;
  resolutionMethod: "consensus" | "organizer";
};
export type MatchRoomSnapshot = {
  matchId: number;
  tournamentSlug: string;
  tournamentName: string;
  stage: string;
  bestOf: number;
  status: MatchRoomStatus;
  currentGameNumber: number;
  teamAName: string;
  teamBName: string;
  teamACaptainId: string;
  teamBCaptainId: string;
  teamACaptainName: string;
  teamBCaptainName: string;
  teamAScore: number;
  teamBScore: number;
  currentUserId: string;
  currentUserSide: WinnerSide | null;
  isOrganizer: boolean;
  reports: MatchRoomReport[];
  games: MatchRoomGame[];
  messages: MatchRoomMessage[];
};
export type MatchRoomCommand =
  | { action: "SEND_MESSAGE"; message: string }
  | { action: "REPORT_GAME_RESULT"; dotaMatchId: string; winnerSide: WinnerSide }
  | { action: "SET_GAME_RESULT"; dotaMatchId: string; winnerSide: WinnerSide }
  | {
      action: "EDIT_GAME_RESULT";
      gameNumber: number;
      dotaMatchId: string;
      winnerSide: WinnerSide;
    };
