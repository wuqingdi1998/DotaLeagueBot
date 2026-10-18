"use client";

import { useEffect } from "react";
import { OctoberDailyCountdownView } from "./OctoberDailyCountdownView";
import { dailyResetCountdownLabel } from "@/app/compendium/model/countdown";
import { currentMoscowDay } from "@/app/compendium/model/time";
import { reloadOctoberCompendiumAfterReward } from "../services/reward-refresh";

export function OctoberDailyCountdown({
  serverNow,
  currentTimeMs,
}: {
  serverNow: string;
  currentTimeMs: number;
}) {
  const resetAt = currentMoscowDay(new Date(serverNow)).end.toISOString();
  const countdown = dailyResetCountdownLabel(resetAt, currentTimeMs);

  useEffect(() => {
    if (countdown === "00:00:00") reloadOctoberCompendiumAfterReward();
  }, [countdown]);

  return <OctoberDailyCountdownView countdown={countdown} />;
}
