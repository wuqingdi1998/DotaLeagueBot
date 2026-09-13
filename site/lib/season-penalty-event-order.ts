export type SeasonPenaltyEventOrder = "createdAt" | "round";

type OrderedSeasonPenaltyEvent = {
  id: number;
  nickname: string;
  round_number: number;
  fire_count: number;
  created_at: string;
};

export function sortSeasonPenaltyEvents<T extends OrderedSeasonPenaltyEvent>(
  events: readonly T[],
  order: SeasonPenaltyEventOrder,
): T[] {
  return [...events].sort((left, right) => {
    if (order === "round") {
      const roundDifference = right.round_number - left.round_number;
      if (roundDifference !== 0) return roundDifference;

      const fireDifference = right.fire_count - left.fire_count;
      if (fireDifference !== 0) return fireDifference;
    }

    const timeDifference =
      Date.parse(right.created_at) - Date.parse(left.created_at);
    if (timeDifference !== 0) return timeDifference;

    return (
      right.id - left.id ||
      left.nickname.localeCompare(right.nickname, "ru")
    );
  });
}
