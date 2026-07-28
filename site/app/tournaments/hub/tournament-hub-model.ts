import type { SessionUser } from "@/app/components/SiteHeader";
import type { TournamentStatus } from "@/lib/tournaments";

export type TournamentSummary = {
  id: number;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  status_label: string;
  format: string;
  team_size: number;
  max_teams: number;
  region: string;
  status: TournamentStatus;
  tournament_type: "ordinary" | "seasonal";
  season_round_count: number;
  participant_count: number;
  team_count: number;
  match_count: number;
  finished_match_count: number;
};

export type TournamentListResponse = {
  tournaments: TournamentSummary[];
  user: SessionUser | null;
};

export type NewTournament = {
  tournament_type: "ordinary" | "seasonal";
  season_round_count: number;
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  headline_accent: string;
  description: string;
  about: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  status_label: string;
  format: string;
  team_size: number;
  max_teams: number;
  region: string;
  server: string;
  check_in_minutes: number;
  group_format: string;
  playoff_format: string;
  playoff_type: "single_elimination" | "double_elimination";
  final_format: string;
  discord_url: string;
  status: TournamentStatus;
};

export const emptyTournament: NewTournament = {
  tournament_type: "ordinary",
  season_round_count: 14,
  slug: "",
  name: "",
  eyebrow: "",
  headline: "",
  headline_accent: "",
  description: "",
  about: "",
  start_at: "",
  end_at: "",
  registration_deadline: "",
  status_label: "",
  format: "",
  team_size: 5,
  max_teams: 8,
  region: "EU / RU",
  server: "EU West",
  check_in_minutes: 60,
  group_format: "",
  playoff_format: "",
  playoff_type: "double_elimination",
  final_format: "",
  discord_url: "https://discord.gg/lsesports",
  status: "draft",
};

export const statusDetails: Record<
  TournamentStatus,
  { label: string; short: string }
> = {
  draft: { label: "Черновик", short: "Черновик организатора" },
  registration: { label: "Регистрация", short: "Регистрация открыта" },
  active: { label: "Идёт сейчас", short: "Турнир идёт" },
  finished: { label: "Завершён", short: "Результаты опубликованы" },
  archived: { label: "Архив", short: "Архивный турнир" },
};

export function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (startDate.getFullYear() === endDate.getFullYear()) {
    const shortStart = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
    }).format(startDate);
    return `${shortStart} — ${formatter.format(endDate)}`;
  }
  return `${formatter.format(startDate)} — ${formatter.format(endDate)}`;
}

export function toTournamentIso(value: string) {
  return value ? `${value}:00+03:00` : value;
}

export function loadSavedTheme() {
  if (typeof window === "undefined") return "dark" as const;
  return window.localStorage.getItem("ls-theme") === "light"
    ? ("light" as const)
    : ("dark" as const);
}
