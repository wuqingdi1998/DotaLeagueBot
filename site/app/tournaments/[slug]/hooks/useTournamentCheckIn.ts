"use client";

import { useEffect, useMemo, useState } from "react";
import { tournamentCheckInWindow } from "@/lib/tournament-check-in";
import type { TournamentSiteData } from "../model/types";

export function useTournamentCheckIn({
  data,
  onMessage,
  onReload,
}: {
  data: TournamentSiteData | null;
  onMessage: (message: string) => void;
  onReload: () => Promise<void>;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const checkInWindow = useMemo(
    () =>
      tournamentCheckInWindow({
        firstMatchAt: data?.tournament.first_match_at ?? null,
        checkInMinutes: data?.tournament.check_in_minutes ?? 0,
        now,
      }),
    [data?.tournament.check_in_minutes, data?.tournament.first_match_at, now],
  );

  const captainApplications = useMemo(
    () =>
      (data?.applications ?? []).filter(
        (application) =>
          application.status === "approved" &&
          application.members.some(
            (member) =>
              member.discord_id === data?.user?.discordId && member.is_captain,
          ),
      ),
    [data],
  );

  async function checkIn(applicationId: number) {
    if (!data) return;
    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tournamentId: data.tournament.id,
        applicationId,
      }),
    });
    const result = (await response.json()) as { error?: string };
    onMessage(
      response.ok
        ? "Чек-ин команды подтверждён"
        : result.error ?? "Не удалось подтвердить участие",
    );
    if (response.ok) await onReload();
  }

  return { captainApplications, checkIn, checkInWindow };
}
