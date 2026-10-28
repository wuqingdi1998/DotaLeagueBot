"use client";

import { useEffect } from "react";
import { FiClock } from "react-icons/fi";
import { useServerClock } from "@/hooks/useServerClock";
import { dailyResetCountdownLabel } from "../model/countdown";

export type ResultsAvailability = {
  serverNow: string;
  archiveAt: string;
  archiveHref: string;
};

export function ResultsAvailabilityCountdown({ serverNow, archiveAt, archiveHref }: ResultsAvailability) {
  const now = useServerClock(serverNow);
  const countdown = dailyResetCountdownLabel(archiveAt, now);
  useEffect(() => {
    if (countdown === "00:00:00") window.location.replace(archiveHref);
  }, [countdown, archiveHref]);
  return (
    <div className="compendium-results-availability" title={`До ${new Date(archiveAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`}>
      <FiClock aria-hidden="true" />
      <span>Результаты доступны ещё</span>
      <time dateTime={archiveAt}>{countdown}</time>
    </div>
  );
}
