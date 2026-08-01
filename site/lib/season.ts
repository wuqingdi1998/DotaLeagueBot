import { compareSeasonStandingPerformance } from "./season-standings-order";

export type SeasonRoundVisibility = {
  id: number;
  roundNumber: number;
  isVisible: boolean;
};

export type SeasonStandingParticipant = {
  playerId: string;
  dotaId: string;
  nickname: string;
  avatarUrl: string | null;
  teamSide: "a" | "b";
};

export type SeasonStandingIdentity = Omit<
  SeasonStandingParticipant,
  "teamSide"
>;

export type SeasonStandingMatch = {
  id: number;
  roundId: number;
  status: "draft" | "published" | "completed" | "cancelled";
  result: "team_a" | "draw" | "team_b" | null;
  teamAScore: number | null;
  teamBScore: number | null;
  participants: SeasonStandingParticipant[];
};

export type SeasonStandingSubstitution = {
  matchId: number;
  outgoingPlayerId: string;
  incomingPlayerId: string;
  incomingDotaId: string;
  incomingNickname: string;
  incomingAvatarUrl: string | null;
  teamSide: "a" | "b";
  technicalLoss: boolean;
};

export type SeasonStandingAdjustment = {
  playerId: string;
  amount: number;
  kind?: "manual" | "activity";
};

export type SeasonStandingPenalty = {
  playerId: string;
  totalFires: number;
  strikes: number;
  stages: Array<number | null>;
  suspendedRoundNumbers: number[];
  pointAdjustment: number;
  isExcluded: boolean;
};

export type SeasonStandingParticipantState = {
  playerId: string;
  section: "active" | "inactive";
  inactiveReason: string | null;
  rankSnapshot?: number | null;
  standingsSnapshot?: {
    playedRounds: number;
    wins: number;
    draws: number;
    losses: number;
    adjustmentPoints: number;
    activityPoints: number;
    points: number;
    winRate: number | null;
    supportsActivityPoints: boolean;
    suspendedRoundNumbers?: number[];
  } | null;
};

export type SeasonStandingModifiers = {
  adjustments?: SeasonStandingAdjustment[];
  substitutions?: SeasonStandingSubstitution[];
  penalties?: SeasonStandingPenalty[];
  participantStates?: SeasonStandingParticipantState[];
};

export type SeasonRoundCell = {
  points: number;
  outcome:
    | "win"
    | "draw"
    | "loss"
    | "mixed"
    | "pending"
    | "substitute"
    | "suspended";
  matchIds: number[];
};

export type SeasonStanding = {
  playerId: string;
  dotaId: string;
  nickname: string;
  avatarUrl: string | null;
  playedRounds: number;
  wins: number;
  draws: number;
  losses: number;
  mapWins: number;
  mapLosses: number;
  winRate: number | null;
  adjustmentPoints: number;
  hasAdjustments: boolean;
  activityPoints: number;
  hasActivityPoints: boolean;
  points: number;
  rounds: Record<string, SeasonRoundCell>;
  section: "active" | "inactive";
  inactiveReason: string | null;
  penaltyFires: number;
  penaltyStrikes: number;
  penaltyStages: Array<number | null>;
  suspendedRoundNumbers: number[];
  rankSnapshot: number | null;
};

export const minimumSeasonRounds = 1;
export const maximumSeasonRounds = 100;
const minimumDatabaseBigInt = BigInt("-9223372036854775808");
const maximumDatabaseBigInt = BigInt("9223372036854775807");

export function isSeasonPlayerDatabaseId(value: unknown) {
  const playerId = String(value ?? "").trim();
  if (!/^-?[1-9]\d{0,18}$/.test(playerId)) return false;
  const numericId = BigInt(playerId);
  return (
    numericId >= minimumDatabaseBigInt &&
    numericId <= maximumDatabaseBigInt
  );
}

export function validSeasonRoundCount(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimumSeasonRounds &&
    Number(value) <= maximumSeasonRounds
  );
}

export function visibleSeasonRounds<T extends SeasonRoundVisibility>(
  rounds: T[],
  includeHidden: boolean,
) {
  return rounds.filter((round) => includeHidden || round.isVisible);
}

export function validateSeasonTeams(teamA: string[], teamB: string[]) {
  if (teamA.length > 5 || teamB.length > 5) {
    return "В каждой команде может быть не более 5 игроков";
  }
  const teamAPlayers = new Set(teamA);
  if (teamB.some((playerId) => teamAPlayers.has(playerId))) {
    return "Один игрок не может находиться в обеих командах";
  }
  return "";
}

export function isValidSeasonTierSnapshot(value: unknown) {
  const tier = Number(value);
  return Number.isInteger(tier) && tier >= 0 && tier <= 12;
}

export function validateSeasonResult(
  result: SeasonStandingMatch["result"],
  teamAScore: number | null,
  teamBScore: number | null,
) {
  if (!result) return "";
  if (teamAScore === null || teamBScore === null) {
    return "Для результата укажите счёт обеих команд";
  }
  if (result === "draw" && teamAScore !== teamBScore) {
    return "Для ничьей счёт команд должен совпадать";
  }
  if (result === "team_a" && teamAScore <= teamBScore) {
    return "При победе команды A её счёт должен быть больше";
  }
  if (result === "team_b" && teamBScore <= teamAScore) {
    return "При победе команды B её счёт должен быть больше";
  }
  return "";
}

export function seasonMatchLinks(matchId: string) {
  const safeMatchId = matchId.trim();
  if (!/^\d{1,32}$/.test(safeMatchId)) return null;
  return {
    dotaBuff: `https://www.dotabuff.com/matches/${safeMatchId}`,
    stratz: `https://stratz.com/matches/${safeMatchId}`,
  };
}

function participantOutcome(
  match: SeasonStandingMatch,
  teamSide: "a" | "b",
): "win" | "draw" | "loss" | "pending" {
  if (
    !["published", "completed"].includes(match.status) ||
    match.result === null
  ) {
    return "pending";
  }
  if (match.result === "draw") return "draw";
  return (
    (match.result === "team_a" && teamSide === "a") ||
    (match.result === "team_b" && teamSide === "b")
  )
    ? "win"
    : "loss";
}

function outcomePoints(outcome: "win" | "draw" | "loss" | "pending") {
  if (outcome === "win") return 2;
  if (outcome === "draw") return 1;
  return 0;
}

export function calculateSeasonStandings(
  rounds: SeasonRoundVisibility[],
  matches: SeasonStandingMatch[],
  participants: SeasonStandingIdentity[] = [],
  modifiers: SeasonStandingModifiers = {},
): SeasonStanding[] {
  const allowedRounds = new Map(
    rounds.map((round) => [round.id, round.roundNumber]),
  );
  const allowedRoundNumbers = new Set(allowedRounds.values());
  const rows = new Map<string, SeasonStanding>();
  const playedRoundsByPlayer = new Map<string, Set<number>>();
  const participantStates = new Map(
    (modifiers.participantStates ?? []).map((state) => [state.playerId, state]),
  );
  const substitutions = modifiers.substitutions ?? [];
  const rewardedSubstitutes = new Set<string>();
  const outgoingByMatchAndPlayer = new Map(
    substitutions.map((substitution) => [
      `${substitution.matchId}:${substitution.outgoingPlayerId}`,
      substitution,
    ]),
  );

  function emptyStanding(participant: SeasonStandingIdentity): SeasonStanding {
    const state = participantStates.get(participant.playerId);
    return {
      playerId: participant.playerId,
      dotaId: participant.dotaId,
      nickname: participant.nickname,
      avatarUrl: participant.avatarUrl,
      playedRounds: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      mapWins: 0,
      mapLosses: 0,
      winRate: null,
      adjustmentPoints: 0,
      hasAdjustments: false,
      activityPoints: 0,
      hasActivityPoints: false,
      points: 0,
      rounds: {},
      section: state?.section ?? "active",
      inactiveReason: state?.inactiveReason ?? null,
      penaltyFires: 0,
      penaltyStrikes: 0,
      penaltyStages: [0, null, null, null],
      suspendedRoundNumbers: [],
      rankSnapshot: state?.rankSnapshot ?? null,
    };
  }

  for (const participant of participants) {
    rows.set(participant.playerId, emptyStanding(participant));
  }

  for (const match of matches) {
    const roundNumber = allowedRounds.get(match.roundId);
    if (roundNumber === undefined || match.status === "cancelled") continue;

    for (const participant of match.participants) {
      const row =
        rows.get(participant.playerId) ?? emptyStanding(participant);
      const substitution = outgoingByMatchAndPlayer.get(
        `${match.id}:${participant.playerId}`,
      );
      const normalOutcome = participantOutcome(match, participant.teamSide);
      const outcome =
        substitution?.technicalLoss && normalOutcome !== "pending"
          ? "loss"
          : normalOutcome;
      const points = outcomePoints(outcome);
      const cell = row.rounds[String(roundNumber)] ?? {
        points: 0,
        outcome,
        matchIds: [],
      };
      const previousOutcomes = new Set([cell.outcome, outcome]);

      cell.points += points;
      cell.matchIds.push(match.id);
      cell.outcome =
        previousOutcomes.size === 1 ? outcome : "mixed";
      row.rounds[String(roundNumber)] = cell;
      row.points += points;

      if (outcome !== "pending") {
        const playedRounds = playedRoundsByPlayer.get(participant.playerId) ??
          new Set<number>();
        playedRounds.add(roundNumber);
        playedRoundsByPlayer.set(participant.playerId, playedRounds);
        if (outcome === "win") row.wins += 1;
        if (outcome === "draw") row.draws += 1;
        if (outcome === "loss") row.losses += 1;
        const ownScore =
          participant.teamSide === "a" ? match.teamAScore : match.teamBScore;
        const opponentScore =
          participant.teamSide === "a" ? match.teamBScore : match.teamAScore;
        if (ownScore !== null && opponentScore !== null) {
          row.mapWins += ownScore;
          row.mapLosses += opponentScore;
        }
      }
      rows.set(participant.playerId, row);
    }
  }

  for (const substitution of substitutions) {
    const match = matches.find((item) => item.id === substitution.matchId);
    const roundNumber = match ? allowedRounds.get(match.roundId) : undefined;
    if (!match || roundNumber === undefined || match.status === "cancelled") {
      continue;
    }
    const identity = {
      playerId: substitution.incomingPlayerId,
      dotaId: substitution.incomingDotaId,
      nickname: substitution.incomingNickname,
      avatarUrl: substitution.incomingAvatarUrl,
    };
    const row =
      rows.get(substitution.incomingPlayerId) ?? emptyStanding(identity);
    const cell = row.rounds[String(roundNumber)] ?? {
      points: 0,
      outcome: "substitute" as const,
      matchIds: [],
    };
    if (!cell.matchIds.includes(match.id)) cell.matchIds.push(match.id);
    row.rounds[String(roundNumber)] = cell;
    if (match.status === "completed" && match.result) {
      const playedRounds =
        playedRoundsByPlayer.get(substitution.incomingPlayerId) ??
        new Set<number>();
      playedRounds.add(roundNumber);
      playedRoundsByPlayer.set(substitution.incomingPlayerId, playedRounds);
      const didWin =
        (match.result === "team_a" && substitution.teamSide === "a") ||
        (match.result === "team_b" && substitution.teamSide === "b");
      if (didWin) {
        const rewardKey = `${match.id}:${substitution.incomingPlayerId}`;
        if (!rewardedSubstitutes.has(rewardKey)) {
          row.adjustmentPoints += 1;
          row.hasAdjustments = true;
          rewardedSubstitutes.add(rewardKey);
        }
      }
    }
    rows.set(substitution.incomingPlayerId, row);
  }

  for (const adjustment of modifiers.adjustments ?? []) {
    const row = rows.get(adjustment.playerId);
    if (!row) continue;
    if (adjustment.kind === "activity") {
      row.activityPoints += adjustment.amount;
      row.hasActivityPoints = true;
    } else {
      row.adjustmentPoints += adjustment.amount;
      row.hasAdjustments = true;
    }
  }

  for (const penalty of modifiers.penalties ?? []) {
    const row = rows.get(penalty.playerId);
    if (!row) continue;
    row.penaltyFires = penalty.totalFires;
    row.penaltyStrikes = penalty.strikes;
    row.penaltyStages = penalty.stages;
    row.suspendedRoundNumbers = penalty.suspendedRoundNumbers;
    row.adjustmentPoints += penalty.pointAdjustment;
    if (penalty.strikes > 0) row.hasAdjustments = true;
    if (penalty.isExcluded) {
      row.section = "inactive";
      row.inactiveReason = "Отстранён за четыре штрафных лимита";
    }
    for (const roundNumber of penalty.suspendedRoundNumbers) {
      if (!row.rounds[String(roundNumber)]) {
        row.rounds[String(roundNumber)] = {
          points: 0,
          outcome: "suspended",
          matchIds: [],
        };
      }
    }
  }

  for (const row of rows.values()) {
    row.playedRounds = playedRoundsByPlayer.get(row.playerId)?.size ?? 0;
    row.points += row.adjustmentPoints + row.activityPoints;
    const playedMaps = row.mapWins + row.mapLosses;
    row.winRate = playedMaps > 0 ? row.mapWins / playedMaps : null;
    const snapshot = participantStates.get(row.playerId)?.standingsSnapshot;
    if (snapshot) {
      row.playedRounds = snapshot.playedRounds;
      row.wins = snapshot.wins;
      row.draws = snapshot.draws;
      row.losses = snapshot.losses;
      row.adjustmentPoints = snapshot.adjustmentPoints;
      row.hasAdjustments = snapshot.adjustmentPoints !== 0;
      row.activityPoints = snapshot.activityPoints;
      row.hasActivityPoints = snapshot.supportsActivityPoints;
      row.points = snapshot.points;
      row.winRate = snapshot.winRate;
      if (snapshot.suspendedRoundNumbers) {
        row.suspendedRoundNumbers = snapshot.suspendedRoundNumbers.filter(
          (roundNumber) => allowedRoundNumbers.has(roundNumber),
        );
        for (const roundNumber of row.suspendedRoundNumbers) {
          row.rounds[String(roundNumber)] = {
            points: 0,
            outcome: "suspended",
            matchIds: [],
          };
        }
      }
    }
  }

  return [...rows.values()].sort(
    (left, right) =>
      (left.rankSnapshot ?? Number.MAX_SAFE_INTEGER) -
        (right.rankSnapshot ?? Number.MAX_SAFE_INTEGER) ||
      compareSeasonStandingPerformance(left, right),
  );
}
