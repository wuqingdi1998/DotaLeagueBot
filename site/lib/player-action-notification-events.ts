"use client";

export const playerActionNotificationsRefreshEvent =
  "player-action-notifications:refresh";

export function announcePlayerActionNotificationsChanged(): void {
  window.dispatchEvent(new Event(playerActionNotificationsRefreshEvent));
}
