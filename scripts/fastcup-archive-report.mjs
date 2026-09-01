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
  const report = [
    "# Проверка импорта LS Fastcup #10–13",
    "",
    `Проверено турниров: **${tournaments.length}**, команд: **${totalTeams}**, мест в составах: **${totalTeams * 5}**.`,
    "",
    "Листы «Тир игроков» не переносятся на сайт отдельными таблицами. Они использованы только для тиров в составах и точного сопоставления профилей.",
    "",
    "Роли во всех книгах помечены как предположительные. Они перенесены в порядке 1–5. Капитаны в источниках не отмечены, поэтому капитанские отметки не ставились.",
    "",
    "Точное время закрытия регистрации не указано: технически оно поставлено на время первого матча. Точное время завершения турниров тоже отсутствует: поставлен конец последнего календарного дня, 23:59 по Москве.",
    "",
    "Теги команд составлены из названий, логотипов в книгах нет. Сервер «Стокгольм» взят из правил турниров.",
    "",
  ];
  for (const tournament of tournaments) {
    const audit = audits.find((entry) => entry.number === tournament.number);
    const missingTiers = tournament.teams.flatMap((team) => team.players
      .filter((player) => !Number.isInteger(player.tier))
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
      `- Лист «Тир игроков»: ${tournament.hasTierSheet ? "использован как справочник" : "отсутствует"}.`,
      "",
      "### Команды и составы",
      "",
    );
    for (const team of tournament.teams) {
      const roster = team.players
        .map((player) => `${player.nickname} — тир ${player.tier ?? "не указан"}`)
        .join("; ");
      report.push(`- **${team.teamName}** — ${team.resultLabel}, суммарный тир ${team.tierTotal ?? "не удалось определить"}: ${roster}.`);
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
      ...(missingTiers.length
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
