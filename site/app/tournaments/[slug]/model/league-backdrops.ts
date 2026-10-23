export const defaultLeagueBackdropId = "3";

const palettes = [
  ["Ледяная сфера", "0,195,255", "92,70,255"],
  ["Изумрудный сад", "0,214,154", "0,124,189"],
  ["Закат над ареной", "255,132,68", "208,53,139"],
  ["Лунный аметист", "159,103,255", "68,155,255"],
] as const;
const patterns = ["Северное сияние", "Световые колонны", "Орбитальные кольца", "Кристаллическая сетка", "Туманности"] as const;
function paint(pattern: number, a: string, b: string) {
  const glow = (color: string, position: string, size: string) =>
    `radial-gradient(ellipse ${size} at ${position}, rgba(${color},.38), transparent 76%)`;
  switch (pattern) {
    case 0: return [glow(a, "0% 20%", "40% 70%"), glow(b, "100% 70%", "35% 65%"),
      `linear-gradient(125deg, transparent 10%, rgba(${b},.16) 22%, transparent 42%, rgba(${a},.13) 82%, transparent)`].join(",");
    case 1: return `linear-gradient(90deg, rgba(${a},.24), transparent 14%, rgba(${b},.2) 19%, transparent 29%, transparent 71%, rgba(${a},.22) 81%, transparent 86%, rgba(${b},.24))`;
    case 2: return [
      `repeating-radial-gradient(ellipse at -20% 45%, transparent 0 90px, rgba(${a},.2) 91px 93px, transparent 94px 145px)`,
      `repeating-radial-gradient(ellipse at 120% 65%, transparent 0 110px, rgba(${b},.18) 111px 113px, transparent 114px 165px)`,
      glow(a, "0% 45%", "28% 60%"), glow(b, "100% 65%", "28% 60%")].join(",");
    case 3: return [
      `repeating-linear-gradient(45deg, transparent 0 48px, rgba(${a},.1) 49px 50px, transparent 51px 98px)`,
      `repeating-linear-gradient(-45deg, transparent 0 48px, rgba(${b},.1) 49px 50px, transparent 51px 98px)`,
      glow(a, "0% 15%", "30% 60%"), glow(b, "100% 85%", "30% 60%")].join(",");
    default: return [glow(a, "5% 8%", "28% 32%"), glow(b, "0% 75%", "25% 45%"),
      glow(b, "98% 25%", "32% 38%"), glow(a, "100% 95%", "26% 50%")].join(",");
  }
}
export const leagueBackdropOptions = palettes.flatMap(([name, a, b], paletteIndex) =>
  patterns.map((pattern, patternIndex) => ({
    id: String(paletteIndex * patterns.length + patternIndex + 1),
    label: `${paletteIndex * patterns.length + patternIndex + 1}. ${name} · ${pattern}`,
    backgroundImage: paint(patternIndex, a, b),
  })),
);
export function leagueBackdropById(id: string) {
  return leagueBackdropOptions.find((option) => option.id === id);
}
