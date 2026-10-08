"use client";

import { useEffect } from "react";
import { DailyResetCountdown } from "@/app/compendium/components/DailyResetCountdown";
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

  return (
    <div className="october-daily-countdown">
      <DailyResetCountdown countdown={countdown} label="До обновления испытаний" />
      <p>Испытания 1, 2, 3 и Рун обновляются ежедневно в 00:00 МСК</p>
    </div>
  );
}
