export const playerRoles = [
  "safe_lane",
  "mid_lane",
  "off_lane",
  "soft_support",
  "hard_support",
] as const;

export type PlayerRole = (typeof playerRoles)[number];

const teamNamePattern =
  /^[A-Za-zА-Яа-яЁё !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/;

export function getTeamNameError(value: string): string {
  const name = value.trim();
  if (!name) return "Введите название команды";
  if (name.length > 20) {
    return "Название команды не может быть длиннее 20 символов";
  }
  if (!/[A-Za-zА-Яа-яЁё]/.test(name)) {
    return "В названии должна быть хотя бы одна русская или английская буква";
  }
  if (!teamNamePattern.test(name)) {
    return "Используйте только русские или английские буквы и обычные символы клавиатуры";
  }
  const specialCharacters = name.match(/[^A-Za-zА-Яа-яЁё]/g) ?? [];
  if (specialCharacters.length > 2) {
    return "В названии можно использовать не более двух специальных символов";
  }
  return "";
}

export function rolesAreComplete(values: string[]): values is PlayerRole[] {
  return (
    values.length === playerRoles.length &&
    values.every((role) => playerRoles.includes(role as PlayerRole)) &&
    new Set(values).size === playerRoles.length
  );
}

export function isSafeUploadKey(value: string): boolean {
  return /^[a-f0-9-]+\.(png|jpg|webp)$/.test(value);
}

export function cleanDiscordRedirect(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return "/";
  }
  return value;
}
