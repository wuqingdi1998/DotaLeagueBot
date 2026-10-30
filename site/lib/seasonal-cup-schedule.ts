import { moscowDateKey } from "./moscow-date-time";

export function seasonalCupPlayoffDateError(body: Record<string, unknown>): string {
  if (body.tournament_type !== "seasonal_cup" || !body.playoff_starts_on) {
    body.playoff_starts_on = null;
    return "";
  }
  const value = String(body.playoff_starts_on);
  const date = new Date(`${value}T00:00:00+03:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || moscowDateKey(date) !== value) {
    return "Укажите корректную дату начала плей-офф";
  }
  const start = moscowDateKey(String(body.start_at ?? ""));
  const end = moscowDateKey(String(body.end_at ?? ""));
  if (!start || !end || value <= start || value > end) {
    return "Плей-офф должен начинаться после группового этапа и не позже окончания кубка";
  }
  body.playoff_starts_on = value;
  return "";
}
