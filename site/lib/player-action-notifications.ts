export type PlayerActionNotificationKind =
  | "team-check-in"
  | "season-check-in"
  | "team-invitation";

export type PlayerActionNotification = {
  id: string;
  kind: PlayerActionNotificationKind;
  href: string;
  label: string;
  dueAt: string;
};

const notificationPriority: Record<PlayerActionNotificationKind, number> = {
  "team-check-in": 0,
  "season-check-in": 0,
  "team-invitation": 1,
};

export function orderPlayerActionNotifications(
  notifications: PlayerActionNotification[],
): PlayerActionNotification[] {
  return [...notifications].sort((left, right) => {
    const priorityDifference =
      notificationPriority[left.kind] - notificationPriority[right.kind];
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
  });
}

export function nextPlayerActionNotification(
  notifications: PlayerActionNotification[],
  lastOpenedId: string | null,
): PlayerActionNotification | null {
  if (!notifications.length) return null;
  const lastOpenedIndex = notifications.findIndex(
    (notification) => notification.id === lastOpenedId,
  );
  return notifications[(lastOpenedIndex + 1) % notifications.length];
}
