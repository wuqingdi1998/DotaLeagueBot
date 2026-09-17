import type { FearlessDraftCommand, FearlessDraftSnapshot } from "./snapshot";

/** Confirm only explicit results; a changed version alone does not prove success. */
export function isDraftCommandConfirmed(
  command: FearlessDraftCommand,
  before: FearlessDraftSnapshot,
  after: FearlessDraftSnapshot,
): boolean {
  const previousMap = before.series?.map;
  const map = after.series?.map;
  if (!previousMap || !map || previousMap.id !== map.id) return false;
  if (command.action === "MAKE_CHOICE") {
    return previousMap.status === "FIRST_DECISION"
      ? map.firstChooserId === before.user.id && map.firstChoice === command.choice
      : previousMap.status === "SECOND_DECISION"
        && map.firstChooserId !== before.user.id && map.secondChoice === command.choice;
  }
  if (command.action === "SELECT_HERO") {
    return map.actions.some((action) => action.step === previousMap.currentStep
      && action.actorId === before.user.id && action.heroId === command.heroId
      && !action.isAutomatic);
  }
  if (command.action === "SUBMIT_LINEUP_ASSIGNMENT") {
    const lineup = map.lineupAssignment;
    return before.user.id === after.series?.player1.id
      ? Boolean(lineup?.player1Submitted)
      : before.user.id === after.series?.player2.id
        ? Boolean(lineup?.player2Submitted)
        : false;
  }
  return false;
}
