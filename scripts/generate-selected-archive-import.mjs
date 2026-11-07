import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSelectedArchiveWorkbooks } from "./selected-archive-parser.mjs";
import { flattenImportData, buildSql } from "./fastcup-archive-import-writer.mjs";
import { findDotaIdConflicts } from "./fastcup-archive-identities.mjs";

export const selectedArchiveBase = -8600000000020000n;
export const selectedArchiveMigration = "bot/database/migrations/development/0198_selected_archive_tournaments.sql";
export function selectedArchiveImport() {
  const workbooks = JSON.parse(fs.readFileSync(new URL("./data/selected-archive-workbooks.json", import.meta.url), "utf8"));
  const tournaments = parseSelectedArchiveWorkbooks(workbooks);
  const data = flattenImportData(tournaments, selectedArchiveBase);
  const sql = buildSql(tournaments, data).replace("scripts/generate-fastcup-archive-import.mjs", "scripts/generate-selected-archive-import.mjs");
  return { tournaments, data, sql };
}

function auditReport(tournaments) {
  const report = [
    "# Турниры из Турниры2.xlsx с отметкой «Вносим на сайт»", "",
    "Импорт предназначен только для linkens_development. Основной сайт не меняется.", "",
    "В составе сохраняется nickname_snapshot на дату турнира. Проверенные прежние варианты ников используются только для связи с профилем. Неоднозначное сопоставление оставляет архивный профиль; объединение доступно организатору штатным способом.", "",
    "Число карт берётся из суммы счёта каждой серии. Индивидуальные номера матчей Dota и порядок карт отсутствуют: они не выдумываются. Все карты BO3 учитываются у каждого участника состава; замены внутри серий в источниках не отмечены.", "",
    "Годы восстановлены по датам, календарю и книгам. Закрытие регистрации принято равным первому матчу, завершение — 23:59 последнего дня. Теги команд технические, логотипы отсутствуют. Позиции в составах предварительные; справочные тиры перенесены по прежнему порядку импорта, расхождения перечислены ниже.", "",
    "| Турнир | Команд | Составов игроков | Матчей | Карт | Режим |", "|---|---:|---:|---:|---:|---|",
    ...tournaments.map((t) => `| ${t.name} | ${t.teams.length} | ${t.teams.length * 5} | ${t.matches.length} | ${t.matches.reduce((s, m) => s + m.scoreA + m.scoreB, 0)} | ${t.metadata.gameMode} |`), "",
    "## Спорные Dota ID", "",
    ...findDotaIdConflicts(tournaments).map((items) => `- ${items[0].nickname}: ${[...new Set(items.map((p) => p.dotaId))].join(", ")}. Эти ID не используются для автоматической связи; исторический ник сохранён.`), "",
    "## Предварительная сверка профилей dev, 8 ноября 2026", "",
    "Из 84 уникальных участников 73 сопоставляются с существующими профилями (действующими или архивными). Совпадений одного профиля в нескольких командах одного турнира нет. Отдельные архивные записи: L0rd_BatON, margiela, Mapes, Odinokiy_bog, hexagon, ГАНДОПЛЯС, ANG3L1C, mollysorry, !Flopz!, aizi, TeMan. Они доступны для последующего объединения организатором; автоматическая привязка !Flopz! к Sanraizu не предполагается.", "",
  ];
  for (const tournament of tournaments) {
    report.push(`## ${tournament.name}`, "", `[Исходная таблица](https://docs.google.com/spreadsheets/d/${tournament.metadata.sourceId}/edit) · ${tournament.metadata.startAt.slice(0, 10)} — ${tournament.metadata.endAt.slice(0, 10)}`, "");
    for (const team of tournament.teams) {
      const matches = tournament.matches.filter((m) => m.teamA === team.teamName || m.teamB === team.teamName);
      const maps = matches.reduce((n, m) => n + m.scoreA + m.scoreB, 0);
      const wins = matches.reduce((n, m) => n + (m.teamA === team.teamName ? m.scoreA : m.scoreB), 0);
      report.push(`- **${team.teamName}**: ${team.resultLabel}; приз: ${team.prizeText ?? "не указан"}; каждый игрок: ${maps} карт / ${wins} побед.`, `  Состав: ${team.players.map((p) => `${p.nickname}${p.isCaptain ? " (капитан)" : ""}${p.linkedNickname !== p.nickname ? ` → ${p.linkedNickname}` : ""}`).join("; ")}.`);
    }
    report.push("", ...tournament.discrepancies.map((d) => `- ${d}`), "");
  }
  return report.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { tournaments, sql } = selectedArchiveImport();
  fs.writeFileSync(selectedArchiveMigration, sql, "utf8");
  fs.writeFileSync("docs/selected-archive-import-audit.md", auditReport(tournaments), "utf8");
  console.log(`Сформировано турниров: ${tournaments.length}`);
}
