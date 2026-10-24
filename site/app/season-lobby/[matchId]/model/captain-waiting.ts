import type { SeasonLobbyRoomPlayer, SeasonLobbyRoomSnapshot } from "./types";

function hasTeamFinishedVoting(players: SeasonLobbyRoomPlayer[]): boolean {
  if (!players.length) return false;
  return players.some((player) => player.isCaptain) ||
    players.filter((player) => player.wantsCaptain).length <= 1 ||
    players.every((player) => player.hasVoted);
}

export function captainWaitingMessage(
  snapshot: SeasonLobbyRoomSnapshot,
  hasOwnInterestAnswer = snapshot.ownCaptainInterest !== null,
): string {
  const team = snapshot.players.filter((player) => player.teamSide === snapshot.currentUserTeamSide);
  const opponents = snapshot.players.filter((player) => player.teamSide !== snapshot.currentUserTeamSide);
  if (!team.length || !opponents.length) return "Ожидаем ответы участников.";
  if (snapshot.status === "captain_reveal") return "Выбор завершён. Показываем итоги голосования.";
  if (snapshot.status === "captain_interest") {
    const hasTeamAnswered = team.every((player) => player.hasAnsweredCaptainInterest ||
      (player.playerId === snapshot.currentUserId && hasOwnInterestAnswer));
    if (!hasTeamAnswered) return "Ожидаем ответы вашей команды.";
    return opponents.every((player) => player.hasAnsweredCaptainInterest)
      ? "Ответы получены. Переходим к следующему этапу."
      : "Оппонент делает выбор";
  }
  if (snapshot.status === "captain_tiebreak" || snapshot.captainTiebreak) {
    const hasTeamFinished = team.some((player) => player.isCaptain) || snapshot.captainTiebreak?.hasResponded;
    if (!hasTeamFinished) return "Ожидаем решающий голос вашей команды.";
    return opponents.some((player) => player.isCaptain)
      ? "Выбор завершён. Переходим к итогам голосования."
      : "Оппонент делает выбор";
  }
  if (!hasTeamFinishedVoting(team)) return "Ожидаем голоса вашей команды.";
  return hasTeamFinishedVoting(opponents)
    ? "Выбор завершён. Переходим к итогам голосования."
    : "Оппонент делает выбор";
}
