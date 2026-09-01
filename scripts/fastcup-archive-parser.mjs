import {
  fastcupMetadata,
  fastcupTeamTags,
  knownFastcupAliases,
} from "./fastcup-archive-import-config.mjs";

const roles = [
  "safe_lane",
  "mid_lane",
  "off_lane",
  "soft_support",
  "hard_support",
];

export const clean = (value) =>
  String(value ?? "").replace(/\s+/g, " ").trim();

export const key = (value) => clean(value).toLocaleLowerCase("ru");

const displayedRows = (sheet) => sheet?.DisplayRows ?? sheet?.Rows ?? [];

const findSheet = (workbook, name) =>
  workbook.Sheets.find((sheet) => key(sheet.Name) === key(name));

const numberFrom = (value) => {
  const text = clean(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const scoreFrom = (rows, rowIndex, columnIndex) => {
  for (let offset = 1; offset <= 3; offset += 1) {
    const value = clean(rows[rowIndex]?.[columnIndex + offset]);
    if (value) return value;
  }
  return "";
};

const seriesBestOf = (format) => Number(clean(format).match(/\d+/)?.[0] ?? 1);

const parseTierSheet = (workbook) => {
  const sheet = findSheet(workbook, "Тир игроков");
  if (!sheet) return new Map();
  const tiers = new Map();
  for (const [rowIndex, row] of displayedRows(sheet).slice(1).entries()) {
    const nickname = clean(row[1]);
    const tier = numberFrom(row[2]);
    if (!nickname || !Number.isInteger(tier)) continue;
    const link = clean(
      sheet.HyperlinkRows?.[rowIndex + 1]?.[4] ?? row[4],
    );
    tiers.set(key(nickname), {
      nickname,
      tier,
      dotaId: link.match(/players\/(\d+)/i)?.[1] ?? null,
    });
  }
  return tiers;
};

const parseTeams = (tournamentRows) => {
  const teams = [];
  const participantsRow = tournamentRows.findIndex((row) =>
    row.some((value) => key(value) === "участники"),
  );
  const formatRow = tournamentRows.findIndex((row) =>
    row.some((value) => key(value) === "формат турнира"),
  );
  for (const row of tournamentRows.slice(participantsRow + 1, formatRow)) {
    const seed = numberFrom(row[3]);
    const teamName = clean(row[4]);
    if (!Number.isInteger(seed) || !teamName) continue;
    teams.push({
      seed,
      teamName,
      selectionMethod: clean(row[5]) || "Регистрация",
      tag: fastcupTeamTags[key(teamName)] ?? `T${seed}`,
    });
  }
  return teams;
};

const tierForRoster = (nickname, tierMap) => {
  const linkedNickname = knownFastcupAliases[key(nickname)] ?? nickname;
  return tierMap.get(key(nickname)) ?? tierMap.get(key(linkedNickname)) ?? null;
};

const parseRosters = (workbook, teams, tierMap, discrepancies) => {
  const sheet = findSheet(workbook, "Составы");
  if (!sheet) throw new Error(`${workbook.FileName}: не найден лист «Составы»`);
  const rows = displayedRows(sheet);
  const teamByName = new Map(teams.map((team) => [key(team.teamName), team]));
  for (const [rowIndex, row] of rows.entries()) {
    for (let columnIndex = 0; columnIndex < row.length - 1; columnIndex += 1) {
      if (key(row[columnIndex]) !== "п") continue;
      const team = teamByName.get(key(row[columnIndex + 1]));
      if (!team) continue;
      const players = [];
      for (let playerOffset = 1; playerOffset <= 5; playerOffset += 1) {
        const playerRow = rows[rowIndex + playerOffset] ?? [];
        const position = numberFrom(playerRow[columnIndex]);
        const nickname = clean(playerRow[columnIndex + 1]);
        if (position !== playerOffset || !nickname) {
          throw new Error(
            `${workbook.FileName}: не удалось прочитать пять игроков команды «${team.teamName}»`,
          );
        }
        const tierEntry = tierForRoster(nickname, tierMap);
        const rosterTier = numberFrom(playerRow[columnIndex + 2]);
        if (
          tierEntry &&
          Number.isInteger(rosterTier) &&
          rosterTier !== tierEntry.tier
        ) {
          discrepancies.push(
            `${team.teamName}: у ${nickname} тир ${rosterTier} в составе и ${tierEntry.tier} на листе «Тир игроков»; взят тир из справочного листа.`,
          );
        }
        players.push({
          nickname,
          linkedNickname: knownFastcupAliases[key(nickname)] ?? nickname,
          role: roles[playerOffset - 1],
          tier: tierEntry?.tier ?? rosterTier,
          dotaId: tierEntry?.dotaId ?? null,
          isCaptain: false,
          sortOrder: playerOffset,
        });
      }
      const summary = clean(
        rows[rowIndex + 6]?.slice(columnIndex, columnIndex + 3).join(" "),
      );
      const explicitTotal =
        numberFrom(row[columnIndex + 2]) ??
        numberFrom(summary.match(/тир\s*-\s*(\d+)/i)?.[1]);
      const hasAllTiers = players.every((player) => Number.isInteger(player.tier));
      const calculatedTotal = hasAllTiers
        ? players.reduce((sum, player) => sum + player.tier, 0)
        : null;
      if (
        Number.isInteger(explicitTotal) &&
        Number.isInteger(calculatedTotal) &&
        explicitTotal !== calculatedTotal
      ) {
        discrepancies.push(
          `${team.teamName}: в составе указан суммарный тир ${explicitTotal}, по игрокам получается ${calculatedTotal}.`,
        );
      }
      team.players = players;
      team.tierTotal = explicitTotal ?? calculatedTotal;
    }
  }
  const missing = teams.filter((team) => !team.players);
  if (missing.length) {
    throw new Error(
      `${workbook.FileName}: не найдены составы команд ${missing.map((team) => team.teamName).join(", ")}`,
    );
  }
};

const parsePlacements = (rows, teams) => {
  const titleRow = rows.findIndex((row) =>
    row.some((value) => key(value) === "итоговое положение команд"),
  );
  if (titleRow < 0) return;
  const teamByName = new Map(teams.map((team) => [key(team.teamName), team]));
  for (let rowIndex = titleRow + 2; rowIndex < rows.length; rowIndex += 1) {
    const placementText = clean(rows[rowIndex][3]);
    const team = teamByName.get(key(rows[rowIndex][4]));
    if (!placementText || !team) break;
    const placement = rowIndex - titleRow - 1;
    team.placement = placement;
    team.prizeText = clean(rows[rowIndex][5]) || null;
    team.resultLabel =
      placement === 1
        ? "Победитель"
        : placement === 2
          ? "Финалист"
          : placementText.replace("-", "–") + "-е место";
  }
};

const parseGroupOrder = (rows) => {
  const titleRow = rows.findIndex((row) =>
    row.some((value) => key(value) === "общая группа"),
  );
  if (titleRow < 0) return [];
  const titleColumn = rows[titleRow].findIndex(
    (value) => key(value) === "общая группа",
  );
  const order = [];
  for (let rowIndex = titleRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const teamName = clean(rows[rowIndex][titleColumn]);
    const sortOrder = numberFrom(rows[rowIndex][titleColumn - 1]);
    if (!teamName || !Number.isInteger(sortOrder)) break;
    order.push({ teamName, sortOrder });
  }
  return order;
};

const matchResult = (teamA, teamB, scoreA, scoreB) => {
  const numericA = numberFrom(scoreA);
  const numericB = numberFrom(scoreB);
  if (Number.isInteger(numericA) && Number.isInteger(numericB)) {
    return {
      scoreA: numericA,
      scoreB: numericB,
      resultType: "normal",
      labelA: null,
      labelB: null,
      decisionNote: null,
    };
  }
  const normalizedA = key(scoreA);
  const normalizedB = key(scoreB);
  if ([normalizedA, normalizedB].some((value) => ["ff", "w"].includes(value))) {
    const loser = normalizedA === "ff" ? teamA : teamB;
    return {
      scoreA: null,
      scoreB: null,
      resultType: "forfeit",
      labelA: normalizedA || null,
      labelB: normalizedB || null,
      decisionNote: `Команде «${loser}» засчитано поражение из-за неявки.`,
    };
  }
  return {
    scoreA: null,
    scoreB: null,
    resultType: "technical",
    labelA: scoreA || null,
    labelB: scoreB || null,
    decisionNote: "Результат перенесён из таблицы без числового счёта.",
  };
};

const winnerAndLoser = (match) => {
  if (match.labelA === "w" || match.labelB === "ff") {
    return { winner: match.teamA, loser: match.teamB };
  }
  if (match.labelB === "w" || match.labelA === "ff") {
    return { winner: match.teamB, loser: match.teamA };
  }
  return match.scoreA > match.scoreB
    ? { winner: match.teamA, loser: match.teamB }
    : { winner: match.teamB, loser: match.teamA };
};

const scheduledAt = (metadata, stageName, roundNumber, time) => {
  const schedule = metadata.schedules.find((entry) =>
    stageName === "group"
      ? entry[3].endsWith(`Раунд ${roundNumber}`)
      : stageName === "final"
        ? entry[3] === "Гранд-финал"
        : entry[3].includes("Плей-офф"),
  );
  return `${schedule[0]}T${time || schedule[2]}:00+03:00`;
};

const parseMatches = (rows, metadata, discrepancies) => {
  const matches = [];
  const seenGroupHeaders = new Set();
  const groupSlots = new Map();
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, value] of row.entries()) {
      const header = clean(value);
      const groupHeader = header.match(/^ГЭ\s+(\d+)\.(\d+)\s*\[/i);
      if (!groupHeader) continue;
      const roundNumber = Number(groupHeader[1]);
      const sourceKey = `${roundNumber}.${groupHeader[2]}`;
      if (seenGroupHeaders.has(sourceKey)) {
        discrepancies.push(
          `В сетке дважды указан заголовок «ГЭ ${sourceKey}»; матчи сохранены по фактическим парам команд.`,
        );
      }
      seenGroupHeaders.add(sourceKey);
      const slot = (groupSlots.get(roundNumber) ?? 0) + 1;
      groupSlots.set(roundNumber, slot);
      const teamA = clean(rows[rowIndex + 1]?.[columnIndex]);
      const teamB = clean(rows[rowIndex + 2]?.[columnIndex]);
      const time = header.match(/(\d{1,2}:\d{2})/)?.[1] ?? "";
      const result = matchResult(
        teamA,
        teamB,
        scoreFrom(rows, rowIndex + 1, columnIndex),
        scoreFrom(rows, rowIndex + 2, columnIndex),
      );
      const schedule = metadata.schedules[roundNumber - 1];
      matches.push({
        matchKey: `g${roundNumber}-${slot}`,
        stage: `Групповой этап · Тур ${roundNumber}`,
        groupName: "Общая группа",
        teamA,
        teamB,
        bestOf: seriesBestOf(schedule[5]),
        scheduledAt: scheduledAt(metadata, "group", roundNumber, time),
        bracketRound: roundNumber,
        bracketSide: "group",
        bracketSlot: slot,
        ...result,
      });
    }
  }
  const playoffMatches = [];
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, value] of row.entries()) {
      const header = clean(value);
      const playoffHeader = header.match(/^(ГФ|ПФ(?:\s+\d+)?)\s*\[/i);
      if (!playoffHeader) continue;
      const isFinal = key(playoffHeader[1]) === "гф";
      const teamA = clean(rows[rowIndex + 1]?.[columnIndex]);
      const teamB = clean(rows[rowIndex + 2]?.[columnIndex]);
      const time = header.match(/(\d{1,2}:\d{2})/)?.[1] ?? "";
      const result = matchResult(
        teamA,
        teamB,
        scoreFrom(rows, rowIndex + 1, columnIndex),
        scoreFrom(rows, rowIndex + 2, columnIndex),
      );
      const schedule = metadata.schedules.find((entry) =>
        isFinal ? entry[3] === "Гранд-финал" : entry[3].includes("Плей-офф"),
      );
      playoffMatches.push({
        matchKey: isFinal ? "gf" : `sf${playoffMatches.filter((match) => !match.isFinal).length + 1}`,
        stage: isFinal ? "Гранд-финал" : "Плей-офф · Полуфинал",
        groupName: null,
        teamA,
        teamB,
        bestOf: seriesBestOf(schedule[5]),
        scheduledAt: scheduledAt(metadata, isFinal ? "final" : "playoff", null, time),
        bracketSide: isFinal ? "grand_final" : "upper",
        bracketSlot: isFinal ? 1 : playoffMatches.filter((match) => !match.isFinal).length + 1,
        isFinal,
        ...result,
      });
    }
  }
  const final = playoffMatches.find((match) => match.isFinal);
  const semifinals = playoffMatches.filter((match) => !match.isFinal);
  for (const semifinal of semifinals) {
    const outcome = winnerAndLoser(semifinal);
    semifinal.bracketRound = 1;
    semifinal.winnerToKey = "gf";
    semifinal.winnerToSlot = key(outcome.winner) === key(final.teamA) ? "a" : "b";
    semifinal.eliminatedTeam = outcome.loser;
  }
  if (final) {
    final.bracketRound = semifinals.length ? 2 : 1;
    final.eliminatedTeam = winnerAndLoser(final).loser;
  }
  return [...matches, ...semifinals, final].filter(Boolean).map((match, index) => ({
    ...match,
    sortOrder: index + 1,
  }));
};

const parseRules = (workbook, discrepancies) => {
  const sheet = findSheet(workbook, "Доп. правила");
  if (!sheet) return [];
  const rules = [];
  const sourceNumbers = new Set();
  for (const row of displayedRows(sheet)) {
    const sourceNumber = clean(row[1]);
    const text = clean(row[3]);
    if (!sourceNumber || !text || !/^\d+$/.test(sourceNumber)) continue;
    if (sourceNumbers.has(sourceNumber)) {
      discrepancies.push(
        `На листе «Доп. правила» номер ${sourceNumber} указан повторно; правила сохранены в порядке строк.`,
      );
    }
    sourceNumbers.add(sourceNumber);
    rules.push(text);
  }
  return rules;
};

export function parseFastcupWorkbooks(workbooks) {
  return workbooks.map((workbook) => {
    const number = Number(workbook.FileName.match(/#(\d+)/)?.[1]);
    const metadata = fastcupMetadata[number];
    if (!metadata) throw new Error(`Нет настроек для ${workbook.FileName}`);
    const tournamentSheet = findSheet(workbook, "Турнир");
    if (!tournamentSheet) throw new Error(`${workbook.FileName}: нет листа «Турнир»`);
    const rows = displayedRows(tournamentSheet);
    const discrepancies = [];
    const tierMap = parseTierSheet(workbook);
    const teams = parseTeams(rows);
    parseRosters(workbook, teams, tierMap, discrepancies);
    parsePlacements(rows, teams);
    const matches = parseMatches(rows, metadata, discrepancies);
    const groupOrder = parseGroupOrder(rows);
    const rules = parseRules(workbook, discrepancies);
    return {
      number,
      name: `LS Fastcup #${number}`,
      metadata,
      teams,
      matches,
      groupOrder,
      rules,
      hasTierSheet: tierMap.size > 0,
      discrepancies,
    };
  });
}
