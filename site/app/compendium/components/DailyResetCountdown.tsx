import { FiClock } from "react-icons/fi";

export function DailyResetCountdown({
  countdown,
  label = "До обновления задания",
  className = "",
}: {
  countdown: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`compendium-section-countdown ${className}`.trim()}
      title="Обновление в 00:00 МСК по серверному времени"
    >
      <FiClock aria-hidden="true" />
      <span>{label}</span>
      <strong>{countdown}</strong>
    </div>
  );
}
