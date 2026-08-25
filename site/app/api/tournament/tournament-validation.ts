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
  "registration_deadline",
] as const;

export function normalizeTournamentDateFields(
  body: Record<string, unknown>,
): string {
  for (const field of tournamentDateFields) {
    const value = body[field];
    if (value === undefined || value === null || value === "") continue;
    const normalized = moscowDateTimeInputToIso(value);
    if (!normalized) {
      return `Укажите корректное значение поля «${editableFieldLabels[field]}»`;
    }
    body[field] = normalized;
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
