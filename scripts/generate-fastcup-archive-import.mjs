import fs from "node:fs";

import { parseFastcupWorkbooks } from "./fastcup-archive-parser.mjs";
import { writeFastcupArchiveImport } from "./fastcup-archive-import-writer.mjs";

const [sourcePath, sqlPath, reportPath] = process.argv.slice(2);
if (!sourcePath || !sqlPath || !reportPath) {
  throw new Error(
    "Укажите JSON из Excel, путь SQL-миграции и путь Markdown-отчёта",
  );
}

const source = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
const tournaments = parseFastcupWorkbooks(JSON.parse(source));
const expected = {
  6: { teams: 6, matches: 9 },
  7: { teams: 4, matches: 8 },
  8: { teams: 6, matches: 11 },
  9: { teams: 3, matches: 5 },
  10: { teams: 4, matches: 7 },
  11: { teams: 6, matches: 12 },
  12: { teams: 4, matches: 8 },
  13: { teams: 4, matches: 8 },
};

for (const tournament of tournaments) {
  const contract = expected[tournament.number];
  if (
    !contract ||
    tournament.teams.length !== contract.teams ||
    tournament.matches.length !== contract.matches
  ) {
    throw new Error(
      `${tournament.name}: ожидалось ${contract?.teams ?? "?"} команд и ${contract?.matches ?? "?"} матчей, ` +
        `получено ${tournament.teams.length} команд и ${tournament.matches.length} матчей`,
    );
  }
  if (tournament.teams.some((team) => team.players.length !== 5)) {
    throw new Error(`${tournament.name}: не во всех командах по пять игроков`);
  }
  if (tournament.groupOrder.length !== tournament.teams.length) {
    throw new Error(`${tournament.name}: итоговая таблица группы неполна`);
  }
}

const result = await writeFastcupArchiveImport({
  tournaments,
  sqlPath,
  reportPath,
});

console.log(
  JSON.stringify({
    tournaments: tournaments.length,
    teams: result.teams.length,
    rosters: result.rosters.length,
    matches: result.matches.length,
    rules: result.rules.length,
    schedules: result.schedules.length,
    livePlayers: result.livePlayerCount,
  }),
);
