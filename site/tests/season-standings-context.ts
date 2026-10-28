import type { SeasonStanding } from "@/lib/season";

const isHistorical = new URLSearchParams(window.location.search).has("historical");
const rows: SeasonStanding[] = Array.from({ length: 13 }, (_, index) => ({
  playerId: String(index + 1), dotaId: String(index + 1),
  nickname: index === 0 ? "ОченьДлинныйНикнеймУчастника" : `Player ${index + 1}`,
  avatarUrl: null, playedRounds: 9, wins: 5, draws: 3, losses: 1,
  mapWins: 13, mapLosses: 5, winRate: .7222, adjustmentPoints: 0, hasAdjustments: false,
  activityPoints: isHistorical ? 2 : 0, hasActivityPoints: isHistorical, points: 13,
  rounds: Object.fromEntries(Array.from({ length: 15 }, (_, round) => [String(round + 1), {
    outcome: round % 3 === 0 ? "win" : round % 3 === 1 ? "draw" : "loss",
    points: round % 3 === 0 ? 2 : round % 3 === 1 ? 1 : 0, matchIds: [round + 1],
  }])), section: index === 12 ? "inactive" : "active", inactiveReason: null,
  penaltyFires: 0, penaltyStrikes: 0, penaltyStages: [null, null, null, null],
  suspendedRoundNumbers: [], rankSnapshot: null,
}));

export function useTournament() {
  return {
    activeTab: "standings",
    data: { tournament: { tournament_type: "seasonal", season_activity_points_note: "Базовые очки за активность этого сезона." } },
    season: {
      data: {
        isOrganizer: true, standings: rows, previewStandings: rows,
        rounds: Array.from({ length: 15 }, (_, i) => ({ id: i + 1, round_number: i + 1, round_kind: "regular", is_visible: i < 14 })),
        coolingProgress: [], penaltyEvents: [],
      },
      error: "",
      openRound: (round: number) => { document.documentElement.dataset.openedRound = String(round); },
    },
  };
}
