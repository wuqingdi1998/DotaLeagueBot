import { describe, expect, it } from "vitest";
import {
  seasonRoundCancellationDeadline,
  seasonRoundCancellationIsOpen,
  seasonRoundCheckInIsOpen,
  seasonRoundCheckInWindow,
  seasonRoundRegistrationDeadline,
  seasonRoundRegistrationIsOpen,
} from "./season-round-registration";

describe("season round registration", () => {
  const scheduledAt = "2026-09-20T17:00:00.000Z";

  it("keeps registration open until ten minutes before the round starts", () => {
    expect(seasonRoundRegistrationDeadline(scheduledAt)).toBe(
      "2026-09-20T16:50:00.000Z",
    );
    expect(
      seasonRoundRegistrationIsOpen({
        scheduledAt,
        now: "2026-09-19T16:59:59.999Z",
        roundKind: "regular",
        roundStatus: "planned",
        tournamentStatus: "active",
      }),
    ).toBe(true);
    expect(
      seasonRoundRegistrationIsOpen({
        scheduledAt,
        now: "2026-09-20T16:49:59.999Z",
        roundKind: "regular",
        roundStatus: "planned",
        tournamentStatus: "active",
      }),
    ).toBe(true);
    expect(
      seasonRoundRegistrationIsOpen({
        scheduledAt,
        now: "2026-09-20T16:50:00.000Z",
        roundKind: "regular",
        roundStatus: "planned",
        tournamentStatus: "active",
      }),
    ).toBe(false);
  });

  it("closes cancellation exactly 24 hours before the round starts", () => {
    expect(seasonRoundCancellationDeadline(scheduledAt)).toBe(
      "2026-09-19T17:00:00.000Z",
    );
    const base = {
      scheduledAt,
      roundKind: "regular" as const,
      roundStatus: "planned" as const,
      tournamentStatus: "active" as const,
    };
    expect(
      seasonRoundCancellationIsOpen({
        ...base,
        now: "2026-09-19T16:59:59.999Z",
      }),
    ).toBe(true);
    expect(
      seasonRoundCancellationIsOpen({
        ...base,
        now: "2026-09-19T17:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("opens check-in two hours before start and closes it ten minutes before", () => {
    expect(seasonRoundCheckInWindow(scheduledAt)).toEqual({
      opensAt: "2026-09-20T15:00:00.000Z",
      closesAt: "2026-09-20T16:50:00.000Z",
    });
    const base = {
      scheduledAt,
      roundKind: "regular" as const,
      roundStatus: "planned" as const,
      tournamentStatus: "active" as const,
    };
    expect(
      seasonRoundCheckInIsOpen({
        ...base,
        now: "2026-09-20T14:59:59.999Z",
      }),
    ).toBe(false);
    expect(
      seasonRoundCheckInIsOpen({
        ...base,
        now: "2026-09-20T15:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      seasonRoundCheckInIsOpen({
        ...base,
        now: "2026-09-20T16:50:00.000Z",
      }),
    ).toBe(false);
  });

  it("does not open for finals, cancelled rounds, or missing dates", () => {
    const base = {
      scheduledAt,
      now: "2026-09-18T17:00:00.000Z",
      roundStatus: "planned" as const,
      tournamentStatus: "active" as const,
    };
    expect(
      seasonRoundRegistrationIsOpen({ ...base, roundKind: "finals" }),
    ).toBe(false);
    expect(
      seasonRoundRegistrationIsOpen({
        ...base,
        roundKind: "regular",
        roundStatus: "cancelled",
      }),
    ).toBe(false);
    expect(
      seasonRoundRegistrationIsOpen({
        ...base,
        scheduledAt: null,
        roundKind: "regular",
      }),
    ).toBe(false);
  });
});
