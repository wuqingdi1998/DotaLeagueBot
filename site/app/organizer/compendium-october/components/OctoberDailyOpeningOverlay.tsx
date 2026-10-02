import { FiLock } from "react-icons/fi";
import { OCTOBER_DAILY_OPENING_LABEL } from "../model/release";

export function OctoberDailyOpeningOverlay() {
  return (
    <div className="october-daily-opening-overlay" role="status">
      <FiLock aria-hidden="true" />
      <strong>Пока не открыто</strong>
      <span>Задание появится {OCTOBER_DAILY_OPENING_LABEL}.</span>
    </div>
  );
}
