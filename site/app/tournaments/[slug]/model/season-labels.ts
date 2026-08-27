import type { SeasonMatch, SeasonRound } from "./season-types";

export function seasonRoundStatusLabel(status: SeasonRound["status"]) {
  return {
    planned: "Запланирован",
    active: "Идёт",
    completed: "Завершён",
    cancelled: "Отменён",
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
