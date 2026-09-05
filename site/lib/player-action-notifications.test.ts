import { describe, expect, it } from "vitest";
import {
  nextPlayerActionNotification,
  orderPlayerActionNotifications,
  type PlayerActionNotification,
} from "./player-action-notifications";

function notification(
  id: string,
  kind: PlayerActionNotification["kind"],
  dueAt: string,
): PlayerActionNotification {
  return { id, kind, dueAt, href: `/${id}`, label: id };
}

describe("player action notifications", () => {
  it("puts open check-ins before team invitations", () => {
    const ordered = orderPlayerActionNotifications([
      notification("invite", "team-invitation", "2026-09-05T10:00:00.000Z"),
      notification("later", "season-check-in", "2026-09-05T12:00:00.000Z"),
      notification("sooner", "team-check-in", "2026-09-05T11:00:00.000Z"),
    ]);

    expect(ordered.map(({ id }) => id)).toEqual([
      "sooner",
      "later",
      "invite",
    ]);
  });

  it("opens the invitation on the second click when check-in is also pending", () => {
    const notifications = [
      notification("check-in", "team-check-in", "2026-09-05T11:00:00.000Z"),
      notification("invite", "team-invitation", "2026-09-05T10:00:00.000Z"),
    ];

    expect(nextPlayerActionNotification(notifications, null)?.id).toBe(
      "check-in",
    );
    expect(nextPlayerActionNotification(notifications, "check-in")?.id).toBe(
      "invite",
    );
    expect(nextPlayerActionNotification(notifications, "invite")?.id).toBe(
      "check-in",
    );
  });

  it("keeps a single unresolved action available after it was opened", () => {
    const notifications = [
      notification("check-in", "team-check-in", "2026-09-05T11:00:00.000Z"),
    ];

    expect(
      nextPlayerActionNotification(notifications, "check-in")?.id,
    ).toBe("check-in");
    expect(nextPlayerActionNotification([], "check-in")).toBeNull();
  });
});
