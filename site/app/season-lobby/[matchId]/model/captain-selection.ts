export const SEASON_CAPTAIN_STAGE_SECONDS = 60;

export type CaptainSelectionPlayer = {
  playerId: string;
  tier: number | null;
  wantsCaptain: boolean;
};

export type CaptainBallot = {
  voterPlayerId: string;
  candidatePlayerId: string;
  isAutomatic: boolean;
};

export type CaptainSelectionResult =
  | { kind: "captain"; captainPlayerId: string }
  | {
      kind: "tiebreak";
      voterPlayerId: string;
      candidatePlayerIds: [string, string];
    };

type RandomIndex = (length: number) => number;

function selectRandom<T>(items: T[], randomIndex: RandomIndex): T {
  const index = Math.max(0, Math.min(items.length - 1, randomIndex(items.length)));
  return items[index];
}

function selectByTier(
  players: Array<Pick<CaptainSelectionPlayer, "playerId" | "tier">>,
  randomIndex: RandomIndex,
) {
  const highestTier = Math.max(...players.map((player) => player.tier ?? 0));
  return selectRandom(
    players.filter((player) => (player.tier ?? 0) === highestTier),
    randomIndex,
  );
}

export function automaticCaptainBallots(
  players: CaptainSelectionPlayer[],
): CaptainBallot[] {
  return players.filter((player) => player.wantsCaptain).map((player) => ({
    voterPlayerId: player.playerId,
    candidatePlayerId: player.playerId,
    isAutomatic: true,
  }));
}

function specialTiebreak(
  players: CaptainSelectionPlayer[],
  ballots: CaptainBallot[],
): CaptainSelectionResult | null {
  const candidates = players.filter((player) => player.wantsCaptain);
  if (candidates.length !== 3) return null;
  const candidateIds = new Set(candidates.map((candidate) => candidate.playerId));
  const externalBallots = ballots.filter(
    (ballot) => !candidateIds.has(ballot.voterPlayerId),
  );
  if (externalBallots.length !== 2) return null;
  const supportedIds = [...new Set(
    externalBallots.map((ballot) => ballot.candidatePlayerId),
  )];
  if (supportedIds.length !== 2) return null;
  const voter = candidates.find(
    (candidate) => !supportedIds.includes(candidate.playerId),
  );
  if (!voter) return null;
  return {
    kind: "tiebreak",
    voterPlayerId: voter.playerId,
    candidatePlayerIds: supportedIds as [string, string],
  };
}

export function resolveCaptainSelection(
  players: CaptainSelectionPlayer[],
  ballots: CaptainBallot[],
  randomIndex: RandomIndex,
): CaptainSelectionResult {
  const candidates = players.filter((player) => player.wantsCaptain);
  if (candidates.length === 0) {
    return {
      kind: "captain",
      captainPlayerId: selectByTier(players, randomIndex).playerId,
    };
  }
  if (candidates.length === 1) {
    return { kind: "captain", captainPlayerId: candidates[0].playerId };
  }
  const tiebreak = specialTiebreak(players, ballots);
  if (tiebreak) return tiebreak;
  const voteCounts = new Map<string, number>();
  for (const ballot of ballots) {
    voteCounts.set(
      ballot.candidatePlayerId,
      (voteCounts.get(ballot.candidatePlayerId) ?? 0) + 1,
    );
  }
  const highestVoteCount = Math.max(
    ...candidates.map((candidate) => voteCounts.get(candidate.playerId) ?? 0),
  );
  const leaders = candidates.filter(
    (candidate) => (voteCounts.get(candidate.playerId) ?? 0) === highestVoteCount,
  );
  return {
    kind: "captain",
    captainPlayerId: selectByTier(leaders, randomIndex).playerId,
  };
}

export function resolveCaptainTiebreak(
  candidates: Array<Pick<CaptainSelectionPlayer, "playerId" | "tier">>,
  selectedCandidateId: string | null,
  randomIndex: RandomIndex,
): string {
  if (
    selectedCandidateId &&
    candidates.some((candidate) => candidate.playerId === selectedCandidateId)
  ) {
    return selectedCandidateId;
  }
  return selectByTier(candidates, randomIndex).playerId;
}
