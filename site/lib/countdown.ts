export function dayCountLabel(value: number): "день" | "дня" | "дней" {
  const days = Math.abs(Math.trunc(value));
  const lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";

  const lastDigit = days % 10;
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}
