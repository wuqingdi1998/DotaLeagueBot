import { roleOptions } from "./constants";
import type { TeamApplication } from "./types";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getTeamNameError(value: string) {
  const name = value.trim();
  if (!name) return "Введите название команды";
  if (name.length > 20) return "Не более 20 символов";
  if (!/[A-Za-zА-Яа-яЁё]/.test(name)) {
    return "Добавьте русские или английские буквы";
  }
  if (!/^[A-Za-zА-Яа-яЁё !\"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/.test(name)) {
    return "Разрешены буквы и обычные символы клавиатуры";
  }
  if ((name.match(/[^A-Za-zА-Яа-яЁё]/g) ?? []).length > 2) {
    return "Можно использовать не более двух специальных символов";
  }
  return "";
}

export function formatDayMonth(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

export function toDateTimeInput(value: string) {
  const date = new Date(value);
  const moscow = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return moscow.toISOString().slice(0, 16);
}

export function fromDateTimeInput(value: string) {
  return `${value}:00+03:00`;
}

export function getTeamPlayers(team: TeamApplication) {
  const players = team.members.length
    ? team.members.map((member) => ({
        name: member.name,
        role: member.role,
        isCaptain: member.is_captain,
        dotaId: member.dota_id,
        tier: member.tier_snapshot,
      }))
    : [
        {
          name: team.captain,
          role: team.captain_role,
          isCaptain: true,
          dotaId: null,
          tier: null,
        },
        {
          name: team.player_2,
          role: team.player_2_role,
          isCaptain: false,
          dotaId: null,
          tier: null,
        },
        {
          name: team.player_3,
          role: team.player_3_role,
          isCaptain: false,
          dotaId: null,
          tier: null,
        },
        {
          name: team.player_4,
          role: team.player_4_role,
          isCaptain: false,
          dotaId: null,
          tier: null,
        },
        {
          name: team.player_5,
          role: team.player_5_role,
          isCaptain: false,
          dotaId: null,
          tier: null,
        },
      ];

  return players.sort(
    (a, b) =>
      roleOptions.findIndex((role) => role.value === a.role) -
      roleOptions.findIndex((role) => role.value === b.role),
  );
}

export function formatTimelineMoment(value: string) {
  return `${formatDayMonth(value)} · ${formatTime(value)} МСК`;
}

export function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

export function formatMatchCount(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${value} матчей`;
  if (last === 1) return `${value} матч`;
  if (last >= 2 && last <= 4) return `${value} матча`;
  return `${value} матчей`;
}
