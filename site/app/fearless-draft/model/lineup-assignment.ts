export type DraftLineupSelection = {
  heroId: number;
  playerId: string;
};

export function validateDraftLineupSelection(
  assignments: readonly DraftLineupSelection[],
  expectedHeroIds: readonly number[],
  eligiblePlayerIds: readonly string[],
): string | null {
  if (assignments.length !== 5) {
    return "Нужно распределить всех пяти героев";
  }
  const heroIds = assignments.map((assignment) => assignment.heroId);
  const playerIds = assignments.map((assignment) => assignment.playerId);
  if (new Set(heroIds).size !== assignments.length) {
    return "Один герой указан несколько раз";
  }
  if (new Set(playerIds).size !== assignments.length) {
    return "Каждому игроку можно назначить только одного героя";
  }
  const expectedHeroes = new Set(expectedHeroIds);
  if (
    expectedHeroes.size !== 5 ||
    heroIds.some((heroId) => !expectedHeroes.has(heroId))
  ) {
    return "Можно распределять только героев своей команды";
  }
  const eligiblePlayers = new Set(eligiblePlayerIds);
  if (
    eligiblePlayers.size !== 5 ||
    playerIds.some((playerId) => !eligiblePlayers.has(playerId))
  ) {
    return "Можно выбирать только игроков своей команды";
  }
  return null;
}
