import type {
  DraftActionType,
  DraftChoice,
  DraftFormat,
  DraftPhase,
  DraftPriority,
  DraftSide,
} from "./types";
import type { DraftTeamPlayerColorSlot } from "./player-colors";

export type DraftPlayer = {
  id: string;
  name: string;
  discordName: string;
  avatarUrl: string | null;
};

export type DraftLobbyPlayer = {
  id: string;
  dotaId: string;
  name: string;
  serverName?: string;
  avatarUrl: string | null;
  teamSide: "a" | "b";
  isOnline: boolean;
  slotNumber?: number | null;
  isCaptain?: boolean;
};

export type DraftHeroSuggestion = {
  heroId: number;
  playerId: string;
  colorSlot: DraftTeamPlayerColorSlot;
};

export type WaitingDraftPlayer = DraftPlayer & {
  joinedAt: string;
};

export type DraftInvitationSnapshot = {
  id: number;
  direction: "INCOMING" | "OUTGOING";
  format: DraftFormat;
  opponent: DraftPlayer;
  expiresAt: string;
};

export type DraftActionSnapshot = {
  step: number;
  actorId: string;
  type: DraftActionType;
  heroId: number | null;
  isAutomatic: boolean;
  createdAt: string;
};

export type DraftMapSnapshot = {
  id: number;
  number: number;
  status: "FIRST_DECISION" | "SECOND_DECISION" | "DRAFTING" | "COMPLETE";
  coinTossWinnerId: string | null;
  coinTossSegment: number | null;
  firstChooserId: string;
  firstChoice: DraftChoice | null;
  secondChoice: DraftChoice | null;
  radiantPlayerId: string | null;
  firstPickPlayerId: string | null;
  currentStep: number;
  version: number;
  currentActorId: string | null;
  currentAction: DraftActionType | null;
  currentPhase: DraftPhase | null;
  baseDurationSeconds: number | null;
  stepStartedAt: string | null;
  player1ReserveSeconds: number;
  player2ReserveSeconds: number;
  actions: DraftActionSnapshot[];
  heroSuggestions: DraftHeroSuggestion[];
  unavailableHeroIds: number[];
  createdAt: string;
};

export type DraftSeriesSnapshot = {
  id: number;
  format: DraftFormat;
  status: "CHOOSING" | "DRAFTING" | "MAP_COMPLETE" | "COMPLETE" | "ABANDONED";
  currentMap: number;
  isLobbyPreview: boolean;
  map1CoinTossWinnerId: string;
  player1: DraftPlayer;
  player2: DraftPlayer;
  player1Connected: boolean;
  player2Connected: boolean;
  player1ReadyForNextMap: boolean;
  player2ReadyForNextMap: boolean;
  endRequest: {
    requestedByPlayerId: string;
    requestedAt: string;
    expiresAt: string;
  } | null;
  map: DraftMapSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type FearlessDraftSnapshot = {
  serverNow: string;
  user: DraftPlayer;
  isOrganizer: boolean;
  isWaiting: boolean;
  waitingPlayers: WaitingDraftPlayer[];
  invitations: DraftInvitationSnapshot[];
  lobbyPlayers?: DraftLobbyPlayer[];
  series: DraftSeriesSnapshot | null;
};

export type FearlessDraftCommand =
  | { action: "START_BOT" }
  | { action: "START_BOT2" }
  | { action: "JOIN_QUEUE" }
  | { action: "LEAVE_QUEUE" }
  | { action: "INVITE"; opponentId: string; format: DraftFormat }
  | { action: "ACCEPT_INVITATION"; invitationId: number }
  | { action: "DECLINE_INVITATION"; invitationId: number }
  | { action: "CANCEL_INVITATION"; invitationId: number }
  | { action: "MAKE_CHOICE"; choice: DraftChoice }
  | { action: "HIGHLIGHT_HERO"; heroId: number; expectedVersion: number }
  | { action: "TOGGLE_HERO_SUGGESTION"; heroId: number; expectedVersion: number }
  | { action: "SELECT_HERO"; heroId: number; expectedVersion: number }
  | { action: "READY_FOR_NEXT_MAP" }
  | { action: "REQUEST_SERIES_END" }
  | { action: "RESPOND_SERIES_END"; response: "ACCEPT" | "DECLINE" }
  | { action: "CANCEL_SERIES_END" }
  | { action: "DISMISS_COMPLETE" };

export type DraftTeamView = DraftPlayer & {
  side: DraftSide;
  priority: DraftPriority;
};
