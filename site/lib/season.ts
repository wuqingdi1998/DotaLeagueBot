export type SeasonRoundVisibility = {
  id: number;
  roundNumber: number;
  isVisible: boolean;
};

export type SeasonStandingParticipant = {
  playerId: string;
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
  participants: SeasonStandingParticipant[];
};

export type SeasonRoundCell = {
  points: number;
  outcome: "win" | "draw" | "loss" | "mixed" | "pending";
  matchIds: number[];
};

export type SeasonStanding = {
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  playedRounds: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  rounds: Record<string, SeasonRoundCell>;
};

export const minimumSeasonRounds = 1;
export const maximumSeasonRounds = 100;

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
  const teamAPlayers = new Set(teamA);
  if (teamB.some((playerId) => teamAPlayers.has(playerId))) {
    return "Один игрок не может находиться в обеих командах";
  }
  return "";
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
): SeasonStanding[] {
  const allowedRounds = new Map(
    rounds.map((round) => [round.id, round.roundNumber]),
  );
  const rows = new Map<string, SeasonStanding>();
  const playedRoundsByPlayer = new Map<string, Set<number>>();

  for (const participant of participants) {
    rows.set(participant.playerId, {
      playerId: participant.playerId,
      nickname: participant.nickname,
      avatarUrl: participant.avatarUrl,
      playedRounds: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      rounds: {},
    });
  }

  for (const match of matches) {
    const roundNumber = allowedRounds.get(match.roundId);
    if (roundNumber === undefined || match.status === "cancelled") continue;

    for (const participant of match.participants) {
      const row = rows.get(participant.playerId) ?? {
        playerId: participant.playerId,
        nickname: participant.nickname,
        avatarUrl: participant.avatarUrl,
        playedRounds: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        rounds: {},
      };
      const outcome = participantOutcome(match, participant.teamSide);
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
      }
      rows.set(participant.playerId, row);
    }
  }

  for (const row of rows.values()) {
    row.playedRounds = playedRoundsByPlayer.get(row.playerId)?.size ?? 0;
  }

  return [...rows.values()].sort(
    (left, right) =>
      right.points - left.points ||
      right.wins - left.wins ||
      left.losses - right.losses ||
      left.nickname.localeCompare(right.nickname, "ru"),
  );
}
