import {
  clean, key, parseTeams, parsePlayerReferenceSheet, parseRosters,
  parsePlacements, parseGroupOrder, parseRules, scoreFrom,
  matchResult, winnerAndLoser,
} from "./fastcup-archive-parser.mjs";
import { selectedArchiveConfig } from "./selected-archive-import-config.mjs";

const sheetRows = (workbook, name) => workbook.Sheets.find((s) => s.Name === name)?.Rows ?? [];
const teamName = (teams, value) => {
  const team = teams.find((t) => key(t.teamName) === key(value));
  if (!team) throw new Error(`Не найдена команда: ${value}`);
  return team.teamName;
};

function normalizeWorkbook(source, config) {
  const workbook = structuredClone(source);
  const rows = sheetRows(workbook, "Турнир");
  if (config.shifted) rows.forEach((r) => r.unshift(null));
  for (const row of rows) {
    const index = row.findIndex((v) => key(v) === "распределение призового фонда");
    if (index >= 0) row[index] = "Итоговое положение команд";
  }
  if (config.number === 104) {
    for (const name of ["Составы", "Тир игроков"]) {
      for (const row of sheetRows(workbook, name)) {
        row.forEach((v, i) => {
          if (typeof v === "string") row[i] = v.replace(/\s+L\s*$/, "");
        });
      }
    }
  }
  if (config.number === 102) {
    const rows = structuredClone(sheetRows(workbook, "Драфты составов").slice(0, 11));
    for (const [index, row] of rows.entries()) {
      for (const [column, value] of row.entries()) {
        if (key(value) !== "п") continue;
        for (let offset = 1; offset <= 5; offset++) rows[index + offset][column] = offset;
      }
    }
    workbook.Sheets.push({ Name: "Составы", Rows: rows });
  }
  return workbook;
}

function stageDetails(code, config) {
  const group = code.match(/^ГЭ\s+(\d+)\.(\d+)/);
  if (group) return { stage: `Групповой этап · Тур ${group[1]}`, bracketSide: "group", bracketRound: +group[1] };
  if (code === "ГФ") return { stage: "Гранд-финал", bracketSide: "grand_final", bracketRound: config.number === 105 || config.number === 106 ? 3 : 2, isFinal: true };
  if (code === "3М") return { stage: "Матч за 3-е место", bracketSide: null, bracketRound: null };
  if (code === "ЧФ") return { stage: "Плей-офф · Четвертьфинал", bracketSide: "upper", bracketRound: 1 };
  if (code.startsWith("ВС")) {
    const round = +code.match(/\d+/)[0];
    return { stage: `Верхняя сетка · ${round === 2 ? "Финал" : "Раунд 1"}`, bracketSide: "upper", bracketRound: round };
  }
  if (code.startsWith("НС") || code === "ФН") {
    const round = code === "ФН" ? 4 : +code.match(/\d+/)[0];
    return { stage: `Нижняя сетка · ${round === 4 ? "Финал" : `Раунд ${round}`}`, bracketSide: "lower", bracketRound: round };
  }
  return { stage: "Плей-офф · Полуфинал", bracketSide: "upper", bracketRound: config.number === 105 ? 2 : 1 };
}

function parseSelectedMatches(rows, teams, groupOrder, config) {
  const matches = [];
  for (const [r, row] of rows.entries()) {
    for (const [c, value] of row.entries()) {
      const header = clean(value);
      const parsed = header.match(/^(ГЭ\s+\d+\.\d+|ПО\s+\d+\.\d+|ПФ(?:\s+\d+)?|ЧФ|3М|ГФ|ВС\s+\d+\.\d+|НС\s+\d+\.\d+|ФН)\s*\[День\s+(\d+)\s*-\s*(\d{1,2}:\d{2})\]/i);
      if (!parsed) continue;
      const code = parsed[1].toUpperCase();
      const stage = stageDetails(code, config);
      const teamA = teamName(teams, rows[r + 1]?.[c]);
      const teamB = teamName(teams, rows[r + 2]?.[c]);
      const groupA = groupOrder.find((g) => key(g.teamName) === key(teamA))?.groupName;
      const groupB = groupOrder.find((g) => key(g.teamName) === key(teamB))?.groupName;
      if (stage.bracketSide === "group" && (!groupA || groupA !== groupB)) throw new Error(`Группа не совпадает: ${teamA} / ${teamB}`);
      const date = config.dates[+parsed[2] - 1];
      if (!date) throw new Error(`Нет даты: ${header}`);
      const explicitBo = row.slice(c + 1, c + 4).map(clean).join(" ").match(/bo([1235])/i);
      const bans = config.number === 103 ? clean(rows[r - 2]?.[c]) : "";
      const result = matchResult(teamA, teamB, scoreFrom(rows, r + 1, c), scoreFrom(rows, r + 2, c));
      matches.push({
        matchKey: code.startsWith("ГЭ") ? `${code}-${r}-${c}` : code,
        sourceHeader: header, ...stage, teamA, teamB,
        groupName: stage.bracketSide === "group" ? groupA : null,
        scheduledAt: `${date}T${parsed[3]}:00+03:00`,
        bestOf: explicitBo ? +explicitBo[1] : stage.isFinal ? 3 : 1,
        ...result, decisionNote: bans ? `Баны предметов: ${bans}` : result.decisionNote,
      });
    }
  }
  matches.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const slots = new Map();
  for (const [i, match] of matches.entries()) {
    const slotKey = `${match.bracketSide}:${match.bracketRound}`;
    match.bracketSlot = (slots.get(slotKey) ?? 0) + 1;
    slots.set(slotKey, match.bracketSlot);
    match.sortOrder = i + 1;
  }
  connectPlayoffs(matches, config);
  return matches;
}

function connectPlayoffs(matches, config) {
  const playoffs = matches.filter((m) => m.bracketSide !== "group");
  const connect = (from, to, outcome) => {
    const source = playoffs.find((m) => m.matchKey === from);
    const target = playoffs.find((m) => m.matchKey === to);
    if (!source || !target) throw new Error(`Нет перехода ${from} → ${to}`);
    const name = winnerAndLoser(source)[outcome];
    const slot = key(target.teamA) === key(name) ? "a" : key(target.teamB) === key(name) ? "b" : null;
    if (!slot) throw new Error(`В следующем матче нет ${name}`);
    source[`${outcome}ToKey`] = to;
    source[`${outcome}ToSlot`] = slot;
  };
  if (config.number === 106) {
    for (const [from, to, outcome] of [
      ["ВС 1.1", "ВС 2.1", "winner"], ["ВС 1.2", "ВС 2.1", "winner"],
      ["ВС 1.1", "НС 2.2", "loser"], ["ВС 1.2", "НС 2.1", "loser"],
      ["НС 1.1", "НС 2.1", "winner"], ["НС 1.2", "НС 2.2", "winner"],
      ["НС 2.1", "НС 3.1", "winner"], ["НС 2.2", "НС 3.1", "winner"],
      ["ВС 2.1", "ГФ", "winner"], ["ВС 2.1", "ФН", "loser"],
      ["НС 3.1", "ФН", "winner"], ["ФН", "ГФ", "winner"],
    ]) connect(from, to, outcome);
  } else {
    for (const match of playoffs.filter((m) => !m.isFinal && m.matchKey !== "3М")) {
      connect(match.matchKey, match.matchKey === "ЧФ" ? "ПФ" : "ГФ", "winner");
      if (playoffs.some((m) => m.matchKey === "3М")) connect(match.matchKey, "3М", "loser");
    }
  }
  for (const match of playoffs) {
    if (!match.loserToKey) match.eliminatedTeam = winnerAndLoser(match).loser;
  }
}

function completePlacements(rows, teams, groupOrder, config) {
  if (config.number === 106) {
    for (const [r, row] of rows.entries()) {
      for (const [c, value] of row.entries()) {
        if (key(value) !== "итоговые места") continue;
        for (let offset = 1; offset <= 4; offset++) {
          const line = rows[r + offset];
          const team = teams.find((t) => key(t.teamName) === key(line[c]));
          const place = clean(line[c - 1] ?? line[c - 2]);
          if (!team || !/^\d+(?:-\d+)?$/.test(place)) throw new Error("Не прочитаны итоговые места 15k Showdown");
          team.placement = +place.split("-")[0];
          team.resultLabel = `${place.replace("-", "–")}-е место`;
        }
      }
    }
    const prizes = { 1: "12 500₽", 2: "2 500₽", 3: "Immortal Treasure I 2022 ×5", 4: "1 месяц любой Boosty-подписки" };
    teams.forEach((team) => { team.prizeText = prizes[team.placement] ?? null; });
  }
  for (const team of teams) {
    if (!team.placement) {
      const rank = groupOrder.find((g) => key(g.teamName) === key(team.teamName))?.sortOrder;
      if (!rank) throw new Error(`Не определено место ${team.teamName}`);
      if (rank <= (config.number === 101 ? 2 : 4)) throw new Error(`Пропущено призовое место ${team.teamName}`);
      team.placement = 5;
      team.resultLabel = "5–6-е место";
    }
    if (team.placement === 1) team.resultLabel = "Победитель";
    if (team.placement === 2) team.resultLabel = "Финалист";
  }
}

export function parseSelectedArchiveWorkbooks(workbooks) {
  return workbooks.map((source) => {
    const config = selectedArchiveConfig[source.FileName];
    if (!config) throw new Error(`Книга не выбрана владельцем: ${source.FileName}`);
    const workbook = normalizeWorkbook(source, config);
    const rows = sheetRows(workbook, "Турнир");
    const metadata = {
      ...config, schedules: [], finalFormat: "Гранд-финал · BO3",
      playoffFormat: config.number === 106 ? "Double Elimination · BO1, финалы BO3" : config.number === 105 ? "Четвертьфинал → полуфинал → финал" : config.advanceToPlayoff === 3 ? "Полуфинал · BO1; победитель группы сразу в финале" : "Полуфиналы · BO1",
      description: `${config.maxTeams} команд. Архив по исходной таблице турнира.`,
      endAt: `${config.dates.at(-1)}T23:59:00+03:00`,
    };
    const discrepancies = [...config.notes];
    const teams = parseTeams(rows);
    const reference = parsePlayerReferenceSheet(workbook);
    parseRosters(workbook, teams, reference.entries, metadata, discrepancies);
    if (config.number === 102) teams.forEach((t) => { t.players[0].isCaptain = true; });
    parsePlacements(rows, teams, metadata, discrepancies);
    const groupOrder = parseGroupOrder(rows, teams, metadata);
    completePlacements(rows, teams, groupOrder, config);
    const matches = parseSelectedMatches(rows, teams, groupOrder, config);
    metadata.startAt = matches[0].scheduledAt;
    metadata.registrationDeadline = metadata.startAt;
    const scheduleGroups = new Map();
    for (const match of matches) {
      const scheduleKey = `${match.scheduledAt}:${match.stage}`;
      if (!scheduleGroups.has(scheduleKey)) scheduleGroups.set(scheduleKey, []);
      scheduleGroups.get(scheduleKey).push(match);
    }
    metadata.schedules = [...scheduleGroups.values()].map((series) => {
      const m = series[0]; const date = m.scheduledAt.slice(0, 10);
      return [date, `День ${config.dates.indexOf(date) + 1}`, m.scheduledAt.slice(11, 16), m.stage, series.length, `BO${m.bestOf}`];
    });
    const rules = parseRules(workbook, discrepancies);
    rules.push(`Исходная таблица турнира: https://docs.google.com/spreadsheets/d/${config.sourceId}/edit`);
    if (config.number === 104) rules.push(clean(rows[40][7]));
    if (config.number === 105) rules.push(clean(rows[20][16]));
    if (config.number === 106) rules.push(clean(rows[33][18]));
    if (config.number === 102) rules.push(config.about);
    return { number: config.number, name: config.name, metadata, teams, groupOrder, matches, rules, hasTierSheet: reference.kind === "tier", hasMmrSheet: false, discrepancies };
  });
}
