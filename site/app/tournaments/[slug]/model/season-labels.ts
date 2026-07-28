import type {
  SeasonLobby,
  SeasonMatch,
  SeasonRound,
} from "./season-types";

export function seasonRoundStatusLabel(status: SeasonRound["status"]) {
  return {
    planned: "Запланирован",
    active: "Идёт",
    completed: "Завершён",
    cancelled: "Отменён",
  }[status];
}

export function seasonLobbyStatusLabel(status: SeasonLobby["status"]) {
  return {
    draft: "Черновик",
    scheduled: "Запланировано",
    live: "Идёт",
    completed: "Завершено",
    cancelled: "Отменено",
  }[status];
}

export function seasonMatchStatusLabel(status: SeasonMatch["status"]) {
  return {
    draft: "Черновик",
    published: "Опубликован",
    completed: "Завершён",
    cancelled: "Отменён",
  }[status];
}
