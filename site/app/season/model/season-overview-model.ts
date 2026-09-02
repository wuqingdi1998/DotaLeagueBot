export const seasonIntroduction =
  "Сезон Linken’s Sphere - это серия турниров в течение 4 месяцев. Основной турнир - еженедельная микс-лига. Лучшие игроки лиги имеют возможность попасть в кубок лиги в ходе сезона, а также в конце сезона лучшие игроки по итогам лиги попадают в финалы лиги. Также в течение сезона проходят дополнительные турниры для подписчиков в формате Fastcup, где игроки самостоятельно собирают команды под разные форматы.";

export const seasonPeriod = "6 сентября – 20 декабря 2026";

export const leagueOverview = {
  title: "Лига",
  descriptor: "14 туров · 1 раз в неделю · BO2",
  period: "6 сентября – 20 декабря 2026",
  summary:
    "Лига – основной турнир сезона. Каждый тур проходит отдельно, и для участия в нём нужно зарегистрироваться именно на этот тур. Если вы видите тур в расписании и хотите сыграть – зарегистрируйтесь. Если не можете или не хотите участвовать – просто пропустите тур.",
  registration:
    "Регистрация проходит отдельно на каждый тур. Можно участвовать не во всех турах.",
  scoring:
    "Победа – 2 очка · Ничья – 1 · Поражение – 0",
  ranking:
    "По итогам регулярной части формируется рейтинг игроков.",
  finalLabel: "ТОП-20 → ФИНАЛ",
  finalExplanation:
    "20 лучших игроков по итогам лиги получают место в финальном турнире сезона.",
  prize: "12 000 ₽",
  tournamentHref: "/tournaments/league-season-9",
  calendarHref: "/calendar",
} as const;

export const leagueCupOverview = {
  title: "Кубок лиги",
  descriptor: "6-недельный турнир",
  period: "2 ноября – 13 декабря 2026",
  summary:
    "Специальный турнир по приглашениям для лучших и наиболее заметных игроков лиги, который проходит в середине сезона.",
  playoffs:
    "Плей-офф и финал · 2 недели · BO3. 1–2 места – верхняя сетка, 3–4 – нижняя.",
  roster: "4 команды · 5 игроков и тренер в каждой",
  groupStage:
    "Групповой этап · 4 недели · BO2 · каждый с каждым",
  stageTimelineLabel:
    "ГРУППОВОЙ ЭТАП (4 НЕДЕЛИ) → ПЛЕЙ-ОФФ И ФИНАЛ (2 НЕДЕЛИ)",
  stageTimelineExplanation:
    "Посев по итогам группы определяет стартовую сетку команд.",
  prize: "7 500 ₽",
  tournamentHref: null,
} as const;

export type FastCupOverview = {
  title: string;
  prize: string;
  period: string;
  format: string;
  tournamentHref: string | null;
};

export const fastCupIntroduction = {
  descriptor: "Дополнительные открытые турниры",
  summary:
    "Дополнительные открытые турниры для подписчиков. Игроки самостоятельно собирают команды под разные форматы.",
  tournamentsHref: "/tournaments",
} as const;

export const fastCupOverviews: readonly FastCupOverview[] = [
  {
    title: "Linken’s Sphere CD Fastcup #7",
    prize: "2 000 ₽",
    period: "12–13 сентября 2026",
    format: "Capitan's Draft",
    tournamentHref: null,
  },
  {
    title: "Linken’s Sphere SD Fastcup #2",
    prize: "2 000 ₽",
    period: "26–27 сентября 2026",
    format: "Single Draft",
    tournamentHref: null,
  },
  {
    title: "Linken’s Sphere Fastcup #14",
    prize: "2 000 ₽",
    period: "10–11 октября 2026",
    format: "Capitan's Mode",
    tournamentHref: null,
  },
  {
    title: "Linken’s Sphere CD Fastcup #8",
    prize: "2 000 ₽",
    period: "24–25 октября 2026",
    format: "Capitan's Draft",
    tournamentHref: null,
  },
  {
    title: "Linken’s Sphere Fastcup #15",
    prize: "2 000 ₽",
    period: "5–6 декабря 2026",
    format: "Capitan's Mode",
    tournamentHref: null,
  },
] as const;
