// Только строки с пометкой «Вносим на сайт» из Турниры2.xlsx.
export const selectedArchiveConfig = {
  "sd-fastcup-1.xlsx": {
    name: "SD Fastcup #1", slug: "sd-fastcup-1", number: 101,
    dates: ["2026-05-30", "2026-05-31"], maxTeams: 6, tierLimit: 37,
    gameMode: "Single Draft", groupFormat: "2 группы · по 3 команды · BO1",
    advanceToPlayoff: 2, shifted: true,
    sourceId: "17iABRQYXgFhSKZkER4WKlFEPmDCSRJ6ZgXbYJIZ6L8o",
    participationNote: "Турнир для Boosty-подписчиков; замены по согласованию.",
    notes: ["Группа B в исходнике подписана латинской буквой; название сохранено."]
  },
  "ls-draft-1.xlsx": {
    name: "LS Draft #1", slug: "ls-draft-1", number: 102,
    dates: ["2026-06-26", "2026-06-28"], maxTeams: 4,
    gameMode: "Captain's Draft", groupFormat: "Общая группа · BO1",
    advanceToPlayoff: 3,
    sourceId: "1U9_PfktDjJ8siS7_yNdEJ1e2HA_S9r7tOHVRgeebCaI",
    about: "Captain's Draft. Турнир для Boosty-подписчиков: капитаны выбирают игроков из пула. Минимальный ранг — Герой. Роли в архивном составе обозначают порядок записи и не подтверждают фактическую позицию в матчах.",
    notes: ["Даты 26 и 28 июня перенесены как 2026 год по книге; подпись первого дня «суббота» не совпадает с календарём.", "Капитаны отмечены буквой C. Остальные номера — порядок драфта; составы сохранены в порядке записи, игровые роли не подтверждены."]
  },
  "ls-item-draft.xlsx": {
    name: "LS Item Draft", slug: "ls-item-draft", number: 103,
    dates: ["2026-02-21", "2026-02-22"], maxTeams: 4, tierLimit: 37,
    gameMode: "Captain's Mode · Item Draft", groupFormat: "Общая группа · BO1",
    advanceToPlayoff: 3,
    sourceId: "1CRxkQJpmANpW0eOvJaRmSagbV4ksitwGsFv0-RCsY74",
    notes: ["Баны предметов сохранены в примечаниях соответствующих матчей; расшифровка — в правилах.", "3500 и 1500 перенесены без добавления валюты: в ячейках она не указана.", "В расписании ошибочно указано по 3 матча тура; фактически в сетке по 2, перенесены фактические матчи."]
  },
  "ls-call-to-arms-2026.xlsx": {
    name: "LS Call to Arms 2026", slug: "ls-call-to-arms-2026", number: 104,
    dates: ["2026-01-31", "2026-02-01"], maxTeams: 6, tierLimit: 38,
    gameMode: "Captain's Mode", groupFormat: "Общая группа · BO1",
    advanceToPlayoff: 4,
    sourceId: "1dI4egfy9qUGGWBaFWlc8R5aAB94aPdTqaFPQ-uuOn18",
    notes: ["Конечная буква L у игроков — отметка легионера; она убрана из ника. Условия наград легионеров сохранены в правилах.", "Последний BO3 в расписании подписан ГЭ Р3, но по сетке является гранд-финалом."]
  },
  "ls-pre-season-bash.xlsx": {
    name: "LS Pre-season Bash", slug: "ls-pre-season-bash", number: 105,
    dates: ["2025-09-05", "2025-09-06", "2025-09-07"], maxTeams: 6, tierLimit: 36,
    gameMode: "Captain's Mode", groupFormat: "Общая группа · BO1",
    advanceToPlayoff: 4,
    sourceId: "1Au9HbYhEyG3DIYuDzXG-pLUybA2ZvOibYExIqY1ZpMs",
    notes: ["Четвертьфинал: 21:05 из сетки; в расписании 19:50. Число матчей взято из фактической сетки.", "Условия возможных переигровок перенесены в правила; сыгранных переигровок в сетке нет, поэтому дополнительные карты не добавлялись."]
  },
  "ls-15k-showdown.xlsx": {
    name: "LS 15k Showdown", slug: "ls-15k-showdown", number: 106,
    dates: ["2025-08-22", "2025-08-23", "2025-08-24"], maxTeams: 8, tierLimit: 36,
    gameMode: "Captain's Mode", groupFormat: "2 группы · по 4 команды · BO1",
    advanceToPlayoff: 4, advanceToUpper: 2, advanceToLower: 2,
    shifted: true, playoffType: "double_elimination",
    sourceId: "1CN2Y7eVMSgyv4Jysy1HHFLhVDjkA2rmWPRwGgFBrXTE",
    notes: ["Полная верхняя и нижняя сетки, включая финал нижней сетки, перенесены отдельно; места 5–8 взяты из итоговых таблиц."]
  }
};
