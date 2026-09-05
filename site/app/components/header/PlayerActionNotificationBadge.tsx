"use client";

import { usePlayerActionNotifications } from "./usePlayerActionNotifications";

export function PlayerActionNotificationBadge({
  playerId,
}: {
  playerId: string;
}) {
  const { currentNotification, markCurrentAsOpened } =
    usePlayerActionNotifications(playerId);
  if (!currentNotification) return null;

  function openNotification() {
    const notification = markCurrentAsOpened();
    if (!notification) return;
    const targetUrl = new URL(notification.href, window.location.origin);
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search
    ) {
      const hasSameHash = targetUrl.hash === window.location.hash;
      window.location.hash = targetUrl.hash;
      if (hasSameHash) window.dispatchEvent(new Event("hashchange"));
      return;
    }
    window.location.assign(notification.href);
  }

  return (
    <button
      className="player-action-notification-badge"
      type="button"
      onClick={openNotification}
      aria-label={currentNotification.label}
      title={currentNotification.label}
    >
      <span aria-hidden="true">!</span>
    </button>
  );
}
