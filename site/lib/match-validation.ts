export function validateFinishedMatchScore(
  teamAScore: number | null | undefined,
  teamBScore: number | null | undefined,
  bestOf: number | null | undefined,
) {
  if (
    !Number.isInteger(teamAScore) ||
    !Number.isInteger(teamBScore) ||
    teamAScore === null ||
    teamAScore === undefined ||
    teamBScore === null ||
    teamBScore === undefined ||
    teamAScore < 0 ||
    teamBScore < 0
  ) {
    return "Для завершённого матча укажите корректный счёт обеих команд";
  }
  if (bestOf === 2) {
    return teamAScore + teamBScore === 2
      ? ""
      : "В матче BO2 сумма сыгранных карт должна быть равна двум";
  }
  if (![1, 3, 5].includes(Number(bestOf))) {
    return "Некорректный формат серии";
  }
  const winsRequired = Math.ceil(Number(bestOf) / 2);
  if (
    Math.max(teamAScore, teamBScore) !== winsRequired ||
    Math.min(teamAScore, teamBScore) >= winsRequired
  ) {
    return `Для BO${bestOf} победителю нужно ${winsRequired} побед по картам`;
  }
  return "";
}
