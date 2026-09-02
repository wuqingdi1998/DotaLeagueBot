import { clean, key } from "./fastcup-archive-parser.mjs";
import {
  buildDotaIdRegistry,
  dotaIdFor,
  findDotaIdConflicts,
  findSharedDotaIdConflicts,
} from "./fastcup-archive-identities.mjs";

const htmlText = (value) =>
  clean(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

export const fetchLivePlayers = async () => {
  const html = await fetch("https://lsesports.ru/participants").then((response) => {
    if (!response.ok) throw new Error(`Сайт участников вернул ${response.status}`);
    return response.text();
  });
  return [
    ...html.matchAll(
      /class="hall-player participants-player"[^>]*href="\/players\/(\d+)"[\s\S]{0,700}?<b>([^<]+)<\/b>/g,
    ),
  ].map((match) => ({ dotaId: match[1], nickname: htmlText(match[2]) }));
};

const sourceCorrections = {
  3: [
    "В расписании финал верхней сетки указан на 25 мая в 21:00, а в самой сетке — на 18:00; у матча сохранено время из фактической сетки, в расписании оставлено 21:00.",
    "У Team Amplify в нижней сетке указано «ТП», а в итоговой таблице вместо места также стоит «ТП»; команда сохранена с отметкой «Техническое поражение» без придуманного места.",
    "В правиле №16 от 25 мая указано отстранение iFlopz! от межсезонных мероприятий; текст правила сохранён, а игрок оставлен в заявленном составе Team Amplify.",
    "У ника Mapes в более поздних книгах указаны два разных Dota ID; в этой книге ID нет, поэтому профиль автоматически не привязан.",
  ],
  4: [
    "В матче верхней сетки у команды «Комару-предаторы» результат записан как «тл» без числового счёта; он сохранён как техническое поражение.",
  ],
  5: [
    "В расписании гранд-финал указан на 4 августа в 21:00, а в самой сетке — на 19:00; у матча сохранено время из фактической сетки, в расписании оставлено 21:00.",
    "В расписании переигровка указана на 28 июля в 22:15, а в сетке — на 22:30; у матча сохранено время из фактической сетки, в расписании оставлено 22:15.",
    "В группе Б дополнительно сыграна переигровка KOMAPU?? — markaryan prime; она внесена по фактической сетке.",
  ],
  6: [
    "Команда «KOMARU v6.8k» в составах и сетке названа «AVE SONYA»; на сайте сохранено заявочное название «KOMARU v6.8k».",
    "В расписании полуфиналы подписаны «НС Ф», а в сетке — «ПО»; внесены два полуфинала по фактической сетке.",
  ],
  7: [
    "В составе название «NON-ALCO 0.0%» записано с точкой, а в заявке и сетке — «NON-ALCO 0,0%»; сохранён вариант из заявки.",
    "В расписании слот 12 октября в 20:00 повторно подписан «ГЭ Р1»; по сетке это второй тур, поэтому внесён второй тур.",
  ],
  8: [
    "В описании формата осталось «4 команды (возможно расширение до 6)», но заявлены и сыграли 6 команд; внесены все 6.",
    "В расписании слот 7 декабря в 19:30 повторно подписан «ГЭ Р1»; по сетке это второй тур, поэтому внесён второй тур.",
  ],
  9: [
    "В сетке перед названием TEAM SWEETBUBBLES остался технический префикс TBA; на сайте он убран.",
  ],
  10: [
    "В расписании третьего дня написано «ГЭ Р3 (2 матча) [bo3]», но сетка показывает гранд-финал из одного BO3; внесён гранд-финал.",
  ],
  11: [
    "В расписании финальный слот подписан «ГЭ Р3 (1 матч) [bo3]», но сетка показывает гранд-финал; внесён гранд-финал.",
  ],
};

const resolutionAudit = (tournaments, livePlayers) => {
  const byName = new Map(livePlayers.map((player) => [key(player.nickname), player]));
  const byDotaId = new Map(livePlayers.map((player) => [player.dotaId, player]));
  const dotaIdRegistry = buildDotaIdRegistry(tournaments);
  return tournaments.map((tournament) => {
    const unresolved = [];
    const idOnly = [];
    const aliases = [];
    for (const team of tournament.teams) {
      for (const player of team.players) {
        const dotaId = dotaIdFor(player, dotaIdRegistry);
        const live = (dotaId ? byDotaId.get(dotaId) : null) ??
          byName.get(key(player.linkedNickname));
        if (key(player.linkedNickname) !== key(player.nickname)) {
          aliases.push(`${player.nickname} → ${player.linkedNickname}`);
        }
        if (!live && dotaId) {
          idOnly.push(`${player.nickname} — Dota ID ${dotaId}`);
        } else if (!live) {
          unresolved.push(player.nickname);
        } else if (key(live.nickname) !== key(player.nickname)) {
          aliases.push(`${player.nickname} → ${live.nickname}`);
        }
      }
    }
    const unique = (values) => [...new Set(values)].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
    return {
      number: tournament.number,
      unresolved: unique(unresolved),
      idOnly: unique(idOnly),
      aliases: unique(aliases),
    };
  });
};

export const buildFastcupReport = (tournaments, livePlayers) => {
  const audits = resolutionAudit(tournaments, livePlayers);
  const identityConflicts = findDotaIdConflicts(tournaments);
  const sharedIdConflicts = findSharedDotaIdConflicts(tournaments);
  const totalTeams = tournaments.reduce((sum, item) => sum + item.teams.length, 0);
  const numbers = tournaments.map((tournament) => tournament.number).sort((a, b) => a - b);
  const range = numbers.length === 1 ? `#${numbers[0]}` : `#${numbers[0]}–${numbers.at(-1)}`;
  const hasMmrWorkbooks = tournaments.some((tournament) => tournament.hasMmrSheet);
  const hasTierWorkbooks = tournaments.some((tournament) => tournament.hasTierSheet);
  const report = [
    `# Проверка импорта LS Fastcup ${range}`,
    "",
    `Проверено турниров: **${tournaments.length}**, команд: **${totalTeams}**, мест в составах: **${totalTeams * 5}**.`,
    "",
    ...(hasTierWorkbooks
      ? ["Листы «Тир игроков» не переносятся на сайт отдельными таблицами. Они использованы только для тиров в составах и точного сопоставления профилей.", ""]
      : []),
    ...(hasMmrWorkbooks
      ? ["Листы «ММР игроков» не переносятся на сайт отдельными таблицами. ММР использован только для проверки составов, а ссылки Stratz — для точного сопоставления профилей. ММР не записывался в поле тира.", ""]
      : []),
    ...(tournaments.some((tournament) => tournament.metadata.mmrLimit && !tournament.hasMmrSheet)
      ? ["В части книг указан лимит командного ММР, но справочный лист «ММР игроков» отсутствует. Поэтому индивидуальный и суммарный ММР для этих составов не придумывался и не переносился.", ""]
      : []),
    "Роли во всех книгах помечены как предположительные. Они перенесены в порядке 1–5. Капитаны в источниках не отмечены, поэтому капитанские отметки не ставились.",
    "",
    "Точное время закрытия регистрации не указано: технически оно поставлено на время первого матча. Точное время завершения турниров тоже отсутствует: поставлен конец последнего календарного дня, 23:59 по Москве.",
    "",
    ...(numbers.some((number) => number >= 6 && number <= 9)
      ? ["Год в книгах #6–9 не указан. Для #6–8 установлен 2024 год, для #9 — 2025 год: это совпадает с подписанными днями недели и последовательностью серии перед Fastcup #10 в августе 2025 года.", ""]
      : []),
    ...(numbers.some((number) => number >= 3 && number <= 5)
      ? ["Год в книгах #3–5 не указан. Установлен 2024 год: дни недели совпадают с датами в таблицах, а порядок согласуется с Fastcup #6 в сентябре 2024 года.", ""]
      : []),
    "Теги команд составлены из названий, логотипов в книгах нет. Сервер «Стокгольм» взят из правил турниров.",
    "",
  ];
  for (const tournament of tournaments) {
    const audit = audits.find((entry) => entry.number === tournament.number);
    const missingTiers = tournament.teams.flatMap((team) => team.players
      .filter((player) => !Number.isInteger(player.tier))
      .map((player) => `${team.teamName}: ${player.nickname}`));
    const missingMmr = tournament.teams.flatMap((team) => team.players
      .filter((player) => !Number.isInteger(player.mmr))
      .map((player) => `${team.teamName}: ${player.nickname}`));
    const tournamentIdentityConflicts = identityConflicts.filter((items) =>
      items.some((item) => item.tournamentNumber === tournament.number),
    );
    const tournamentSharedIdConflicts = sharedIdConflicts.filter((items) =>
      items[0].tournamentNumber === tournament.number,
    );
    report.push(
      `## ${tournament.name}`,
      "",
      `- Период: ${tournament.metadata.startAt.slice(0, 10)} — ${tournament.metadata.endAt.slice(0, 10)}.`,
      `- Команд: ${tournament.teams.length}; матчей: ${tournament.matches.length}; правил: ${tournament.rules.length}.`,
      `- Справочный лист игроков: ${tournament.hasMmrSheet ? "«ММР игроков»" : tournament.hasTierSheet ? "«Тир игроков»" : "отсутствует"}.`,
      "",
      "### Команды и составы",
      "",
    );
    for (const team of tournament.teams) {
      const roster = team.players
        .map((player) => tournament.hasMmrSheet
          ? `${player.nickname} — ММР ${player.mmr ?? "не указан"}`
          : tournament.hasTierSheet
            ? `${player.nickname} — тир ${player.tier ?? "не указан"}`
            : player.nickname)
        .join("; ");
      const total = tournament.hasMmrSheet
        ? `суммарный ММР ${team.mmrTotal ?? "не удалось определить полностью"}`
        : tournament.hasTierSheet
          ? `суммарный тир ${team.tierTotal ?? "не удалось определить"}`
          : "рейтинг игроков в источнике отсутствует";
      report.push(`- **${team.teamName}** — ${team.resultLabel}, ${total}: ${roster}.`);
    }
    report.push(
      "",
      "### Ники и профили",
      "",
      ...(audit.aliases.length
        ? audit.aliases.map((entry) => `- Связан исторический ник: ${entry}.`)
        : ["- Исторические варианты ников не потребовали отдельной связи."]),
      ...(audit.idOnly.length
        ? audit.idOnly.map((entry) => `- Есть точный ID из таблиц, но профиль не показан в текущем списке участников: ${entry}.`)
        : ["- Нет профилей, известных только по Dota ID."]),
      ...(audit.unresolved.length
        ? audit.unresolved.map((entry) => `- Не найдено надёжное сопоставление: ${entry}.`)
        : ["- Ников без ID или надёжного совпадения не осталось."]),
      "",
      "### Неполные и спорные данные",
      "",
      ...(!tournament.hasMmrSheet && !tournament.hasTierSheet && tournament.metadata.mmrLimit
        ? ["- Лист «ММР игроков» отсутствует: проверить индивидуальный и суммарный ММР составов невозможно."]
        : tournament.hasMmrSheet && missingMmr.length
        ? missingMmr.map((entry) => `- На листе «ММР игроков» не найден ММР — ${entry}.`)
        : tournament.hasMmrSheet
          ? ["- ММР найден для всех игроков состава."]
          : missingTiers.length
        ? missingTiers.map((entry) => `- Не найден индивидуальный тир — ${entry}.`)
        : ["- Индивидуальные тиры заполнены для всех игроков."]),
      ...tournamentIdentityConflicts.map((items) => {
        const sources = items.map((item) =>
          `#${item.tournamentNumber} — ${item.dotaId}`,
        ).join(", ");
        return `- У ника ${items[0].nickname} в книгах разные Dota ID (${sources}); спорные ID не использованы, связь выполняется по нику.`;
      }),
      ...tournamentSharedIdConflicts.map((items) => {
        const nicknames = [...new Set(items.map((item) => item.nickname))].join(", ");
        return `- Dota ID ${items[0].dotaId} одновременно указан у разных игроков (${nicknames}); этот ID не использован для автоматической связи.`;
      }),
      ...[...(sourceCorrections[tournament.number] ?? []), ...tournament.discrepancies]
        .map((entry) => `- ${entry}`),
      ...(sourceCorrections[tournament.number] || tournament.discrepancies.length
        ? []
        : ["- Других несостыковок в исходных данных не обнаружено."]),
      "",
    );
  }
  return report.join("\n");
};
