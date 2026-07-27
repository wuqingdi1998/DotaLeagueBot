export type TournamentTextField =
  | "slug"
  | "name"
  | "eyebrow"
  | "status_label"
  | "headline"
  | "headline_accent"
  | "description"
  | "about"
  | "format"
  | "region"
  | "server"
  | "group_format"
  | "playoff_format"
  | "final_format"
  | "discord_url";

type TournamentTextFieldDefinition = {
  field: TournamentTextField;
  label: string;
  placeholder?: string;
  wide?: boolean;
  multiline?: boolean;
};

export const tournamentTextFields: readonly TournamentTextFieldDefinition[] = [
  {
    field: "slug",
    label: "Адрес латиницей",
    placeholder: "summer-cup-2026",
  },
  {
    field: "name",
    label: "Название турнира",
    placeholder: "Summer Community Cup",
  },
  {
    field: "eyebrow",
    label: "Строка над заголовком",
    placeholder: "Летний турнир · Pre-made",
  },
  {
    field: "status_label",
    label: "Видимый статус",
    placeholder: "Регистрация открыта",
  },
  {
    field: "headline",
    label: "Главный заголовок",
    placeholder: "Соберите команду.",
  },
  {
    field: "headline_accent",
    label: "Выделенная часть заголовка",
    placeholder: "Войдите в историю.",
  },
  {
    field: "description",
    label: "Краткое описание",
    wide: true,
    multiline: true,
  },
  {
    field: "about",
    label: "Полное описание",
    wide: true,
    multiline: true,
  },
  {
    field: "format",
    label: "Формат",
    placeholder: "Pre-made · 5 × 5",
  },
  { field: "region", label: "Регион" },
  { field: "server", label: "Игровой сервер" },
  {
    field: "group_format",
    label: "Групповой этап",
    placeholder: "Групповой этап · 2 группы · BO1",
  },
  {
    field: "playoff_format",
    label: "Описание плей-офф",
    placeholder: "Плей-офф · верхняя и нижняя сетка · BO3",
  },
  {
    field: "final_format",
    label: "Гранд-финал",
    placeholder: "Гранд-финал · BO5",
  },
  { field: "discord_url", label: "Ссылка Discord" },
];
