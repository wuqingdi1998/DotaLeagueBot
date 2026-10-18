import { DailyResetCountdown } from "@/app/compendium/components/DailyResetCountdown";

export function OctoberDailyCountdownView({ countdown }: { countdown: string }) {
  return (
    <div className="october-daily-countdown">
      <DailyResetCountdown countdown={countdown} label="До обновления испытаний" />
      <p>Испытания 1, 2, 3 и Рун обновляются ежедневно в 00:00 МСК</p>
    </div>
  );
}
