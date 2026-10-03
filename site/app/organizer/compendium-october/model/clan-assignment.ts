import type { OctoberClanId } from "./clans";

export type OctoberClanCandidate = {
  discordId: string;
  reservation: OctoberClanId | null;
  activityStatus: "available" | "unavailable";
  previousCompendiumStars: number;
  matchesLastThreeMonths: number;
  rankedMatchesLastThreeMonths: number;
  internalRating: number;
  rankTier: number;
};

export type OctoberClanAssignment = {
  discordId: string;
  clanId: OctoberClanId;
  source: "reservation" | "automatic";
  activityScore: number;
  decisionOrder: number;
  reason: string;
};

const CLAN_IDS: readonly OctoberClanId[] = ["morbus", "panacea"];

export function octoberClanActivityScore(
  player: OctoberClanCandidate,
): number {
  return (
    player.previousCompendiumStars * 4 +
    player.rankedMatchesLastThreeMonths * 2 +
    player.matchesLastThreeMonths * 0.25 +
    player.internalRating / 1000 +
    player.rankTier / 10
  );
}

function clanCapacities(players: readonly OctoberClanCandidate[]) {
  const capacities: Record<OctoberClanId, number> = {
    morbus: players.filter((player) => player.reservation === "morbus").length,
    panacea: players.filter((player) => player.reservation === "panacea").length,
  };
  let unallocated = players.length - capacities.morbus - capacities.panacea;
  while (unallocated > 0) {
    const clanId = capacities.morbus <= capacities.panacea ? "morbus" : "panacea";
    capacities[clanId] += 1;
    unallocated -= 1;
  }
  return capacities;
}

function automaticAssignmentReason(input: {
  clanId: OctoberClanId;
  available: readonly OctoberClanId[];
  scores: Record<OctoberClanId, number>;
  counts: Record<OctoberClanId, number>;
}): string {
  const name = input.clanId === "morbus" ? "Морбус" : "Панацея";
  let decidingRule: string;
  if (input.available.length === 1) {
    decidingRule = "во втором клане уже заполнено рассчитанное количество мест";
  } else {
    const otherClanId = input.clanId === "morbus" ? "panacea" : "morbus";
    if (input.scores[input.clanId] < input.scores[otherClanId]) {
      decidingRule = "у этого клана была меньшая сумма баллов активности";
    } else if (input.counts[input.clanId] < input.counts[otherClanId]) {
      decidingRule = "при равных баллах в этом клане было меньше участников";
    } else {
      decidingRule = "показатели кланов были равны, применён стабильный порядок";
    }
  }
  return `Автоматически направлен в клан «${name}»: ${decidingRule}. ` +
    `До назначения сумма баллов была ${input.scores.morbus.toFixed(2)} у Морбуса ` +
    `и ${input.scores.panacea.toFixed(2)} у Панацеи, составы – ` +
    `${input.counts.morbus} и ${input.counts.panacea} участников.`;
}

export function assignOctoberClans(
  players: readonly OctoberClanCandidate[],
): OctoberClanAssignment[] {
  const capacities = clanCapacities(players);
  const counts: Record<OctoberClanId, number> = { morbus: 0, panacea: 0 };
  const scores: Record<OctoberClanId, number> = { morbus: 0, panacea: 0 };
  const assignments: OctoberClanAssignment[] = [];

  for (const player of players.filter((item) => item.reservation !== null)) {
    const clanId = player.reservation!;
    const activityScore = octoberClanActivityScore(player);
    counts[clanId] += 1;
    scores[clanId] += activityScore;
    assignments.push({
      discordId: player.discordId,
      clanId,
      source: "reservation",
      activityScore,
      decisionOrder: assignments.length + 1,
      reason: "Личный выбор игрока сохранён без изменений.",
    });
  }

  const unreserved = players
    .filter((player) => player.reservation === null)
    .sort((left, right) =>
      octoberClanActivityScore(right) - octoberClanActivityScore(left) ||
      left.discordId.localeCompare(right.discordId),
    );

  for (const player of unreserved) {
    const available = CLAN_IDS.filter((clanId) => counts[clanId] < capacities[clanId]);
    const scoreBefore = { ...scores };
    const countBefore = { ...counts };
    const clanId = [...available].sort((left, right) =>
      scores[left] - scores[right] ||
      counts[left] - counts[right] ||
      left.localeCompare(right),
    )[0];
    if (!clanId) throw new Error("Не удалось найти свободное место в кланах");
    const activityScore = octoberClanActivityScore(player);
    counts[clanId] += 1;
    scores[clanId] += activityScore;
    assignments.push({
      discordId: player.discordId,
      clanId,
      source: "automatic",
      activityScore,
      decisionOrder: assignments.length + 1,
      reason: automaticAssignmentReason({
        clanId,
        available,
        scores: scoreBefore,
        counts: countBefore,
      }),
    });
  }

  return assignments;
}
