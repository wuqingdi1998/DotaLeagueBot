import { moscowDateTimeInputToIso } from "@/lib/moscow-date-time";

export const editableTournamentFields = [
  "name",
  "eyebrow",
  "headline",
  "headline_accent",
  "description",
  "about",
  "start_at",
  "end_at",
  "registration_starts_at",
  "registration_deadline",
  "status_label",
  "format",
  "team_size",
  "max_teams",
  "region",
  "server",
  "check_in_minutes",
  "group_format",
  "playoff_format",
  "final_format",
  "discord_url",
  "status",
] as const;

type EditableTournamentField = (typeof editableTournamentFields)[number];

const optionalEditableFields = new Set<EditableTournamentField>([
  "eyebrow",
  "headline_accent",
  "region",
  "server",
  "playoff_format",
  "registration_starts_at",
  "registration_deadline",
  "check_in_minutes",
]);

const editableFieldLabels: Partial<
  Record<EditableTournamentField, string>
> = {
  name: "Название турнира",
  headline: "Главный заголовок",
  description: "Краткое описание",
  about: "Полное описание",
  start_at: "Начало турнира",
  end_at: "Окончание турнира",
  registration_starts_at: "Старт регистрации",
  registration_deadline: "Дедлайн регистрации",
  status_label: "Видимый статус",
  format: "Формат",
  team_size: "Размер команды",
  max_teams: "Количество команд",
  check_in_minutes: "Check-in",
  group_format: "Групповой этап",
  playoff_format: "Плей-офф",
  final_format: "Гранд-финал",
  discord_url: "Ссылка Discord",
  status: "Рабочий статус",
};

const tournamentDateFields = [
  "start_at",
  "end_at",
  "registration_starts_at",
  "registration_deadline",
] as const;

const optionalTournamentDateFields = new Set<EditableTournamentField>([
  "registration_starts_at",
  "registration_deadline",
]);

export function normalizeTournamentDateFields(
  body: Record<string, unknown>,
): string {
  for (const field of tournamentDateFields) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      if (optionalTournamentDateFields.has(field)) body[field] = null;
      continue;
    }
    const normalized = moscowDateTimeInputToIso(value);
    if (!normalized) {
      return `Укажите корректное значение поля «${editableFieldLabels[field]}»`;
    }
    body[field] = normalized;
  }
  return "";
}

export function normalizeOptionalTournamentTiming(body: Record<string, unknown>): string {
  const minutes = body.check_in_minutes;
  if (minutes === undefined || minutes === null || String(minutes).trim() === "") {
    body.check_in_minutes = null;
  } else {
    const value = Number(minutes);
    if (!["number", "string"].includes(typeof minutes) || !Number.isInteger(value) || value < 0 || value > 180) {
      return "Чек-ин должен быть целым числом от 0 до 180 минут или оставаться пустым";
    }
    body.check_in_minutes = value;
  }
  if (body.show_start_in_overview !== undefined && typeof body.show_start_in_overview !== "boolean") {
    return "Укажите, показывать ли старт турнира в обзоре";
  }
  return "";
}

export function registrationStartDateError(
  body: Record<string, unknown>,
): string {
  if (!body.registration_starts_at) return "";

  const registrationStart = new Date(
    String(body.registration_starts_at),
  ).getTime();
  const registrationDeadline = new Date(
    String(body.registration_deadline ?? ""),
  ).getTime();
  if (
    Number.isFinite(registrationDeadline) &&
    registrationStart >= registrationDeadline
  ) {
    return "Старт регистрации должен быть раньше её дедлайна";
  }
  return "";
}

export function missingRequiredTournamentFields(
  body: Record<string, unknown>,
) {
  return editableTournamentFields.filter((field) => {
    if (optionalEditableFields.has(field)) return false;
    if (
      body.tournament_type === "seasonal" &&
      ["group_format", "final_format", "registration_deadline"].includes(
        field,
      )
    ) {
      return false;
    }
    const value = body[field];
    return (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    );
  });
}

export function missingFieldsMessage(fields: EditableTournamentField[]) {
  return `Заполните обязательные поля: ${fields
    .map((field) => editableFieldLabels[field] ?? field)
    .join(", ")}`;
}
