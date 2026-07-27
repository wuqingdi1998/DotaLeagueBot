import type { MatchDraft, PlayerRole, RegistrationForm } from "./types";

export const roleOptions: Array<{
  value: PlayerRole;
  label: string;
  position: number;
}> = [
  { value: "safe_lane", label: "Safe Lane", position: 1 },
  { value: "mid_lane", label: "Mid Lane", position: 2 },
  { value: "off_lane", label: "Off Lane", position: 3 },
  { value: "soft_support", label: "Soft Support", position: 4 },
  { value: "hard_support", label: "Hard Support", position: 5 },
];

export const emptyRegistration: RegistrationForm = {
  team_name: "",
  tag: "",
  captain: "",
  contact: "",
  player_2: "",
  player_3: "",
  player_4: "",
  player_5: "",
  captain_role: "safe_lane",
  player_2_role: "mid_lane",
  player_3_role: "off_lane",
  player_4_role: "soft_support",
  player_5_role: "hard_support",
  rulesAccepted: false,
};

export const emptyMatchDraft: MatchDraft = {
  groupId: "",
  scheduledAt: "",
  stage: "Групповой этап",
  teamAId: "",
  teamBId: "",
  teamAPlaceholder: "",
  teamBPlaceholder: "",
  bestOf: "1",
  bracketSide: "",
  bracketRound: "",
  bracketSlot: "",
};
