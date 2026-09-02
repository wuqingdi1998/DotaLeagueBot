import {
  fastcupMetadata,
  fastcupTeamTags,
  knownFastcupAliases,
  knownFastcupDotaIds,
} from "./fastcup-archive-import-config.mjs";
import { parseDoubleEliminationMatches } from "./fastcup-archive-double-elimination.mjs";

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

const cleanPlayerNickname = (value) =>
  clean(value).replace(/\s*⚜️?\s*$/u, "");

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

const parsePlayerReferenceSheet = (workbook) => {
  const tierSheet = findSheet(workbook, "Тир игроков");
  const mmrSheet = findSheet(workbook, "ММР игроков");
  const sheet = tierSheet ?? mmrSheet;
  if (!sheet) return { entries: new Map(), kind: null };
  const kind = tierSheet ? "tier" : "mmr";
  const entries = new Map();
  for (const [rowIndex, row] of displayedRows(sheet).slice(1).entries()) {
    const nickname = clean(row[1]);
    if (!nickname) continue;
    const tier = kind === "tier" ? numberFrom(row[2]) : null;
    const mmr = kind === "mmr"
      ? row.map(numberFrom).find((value) => Number.isInteger(value) && value >= 1000) ?? null
      : null;
    const sourceRowIndex = rowIndex + 1;
    const links = [
      ...(sheet.HyperlinkRows?.[sourceRowIndex] ?? []),
      ...row,
    ].map(clean);
    const dotaId = links
      .map((value) => value.match(/players\/(\d+)/i)?.[1] ?? null)
      .find(Boolean) ?? null;
    const entry = {
      nickname,
      tier,
      mmr,
      dotaId,
    };
    entries.set(key(nickname), entry);
    entries.set(key(knownFastcupAliases[key(nickname)] ?? nickname), entry);
  }
  return { entries, kind };
};

const canonicalTeamName = (teamName, metadata) =>
  metadata.teamNameAliases?.[key(teamName)] ?? clean(teamName);

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

const referenceForRoster = (nickname, referenceMap) => {
  const linkedNickname = knownFastcupAliases[key(nickname)] ?? nickname;
  return referenceMap.get(key(nickname)) ?? referenceMap.get(key(linkedNickname)) ?? null;
};

const parseRosters = (workbook, teams, referenceMap, metadata, discrepancies) => {
  const sheet = findSheet(workbook, "Составы");
  if (!sheet) throw new Error(`${workbook.FileName}: не найден лист «Составы»`);
  const rows = displayedRows(sheet);
  const teamByName = new Map(teams.map((team) => [key(team.teamName), team]));
  for (const [rowIndex, row] of rows.entries()) {
    for (let columnIndex = 0; columnIndex < row.length - 1; columnIndex += 1) {
      if (key(row[columnIndex]) !== "п") continue;
      const rosterTeamName = canonicalTeamName(row[columnIndex + 1], metadata);
      const team = teamByName.get(key(rosterTeamName));
      if (!team) continue;
      const players = [];
      for (let playerOffset = 1; playerOffset <= 5; playerOffset += 1) {
        const playerRow = rows[rowIndex + playerOffset] ?? [];
        const position = numberFrom(playerRow[columnIndex]);
        const nickname = cleanPlayerNickname(playerRow[columnIndex + 1]);
        if (position !== playerOffset || !nickname) {
          throw new Error(
            `${workbook.FileName}: не удалось прочитать пять игроков команды «${team.teamName}»`,
          );
        }
        const referenceEntry = referenceForRoster(nickname, referenceMap);
        const rosterTier = numberFrom(playerRow[columnIndex + 2]);
        if (
          referenceEntry &&
          Number.isInteger(referenceEntry.tier) &&
          Number.isInteger(rosterTier) &&
          rosterTier !== referenceEntry.tier
        ) {
          discrepancies.push(
            `${team.teamName}: у ${nickname} тир ${rosterTier} в составе и ${referenceEntry.tier} на листе «Тир игроков»; взят тир из справочного листа.`,
          );
        }
        players.push({
          nickname,
          linkedNickname: knownFastcupAliases[key(nickname)] ?? nickname,
          role: roles[playerOffset - 1],
          tier: referenceEntry?.tier ?? rosterTier,
          mmr: referenceEntry?.mmr ?? null,
          dotaId: referenceEntry?.dotaId ?? knownFastcupDotaIds[key(
            knownFastcupAliases[key(nickname)] ?? nickname,
          )] ?? null,
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
      team.mmrTotal = players.every((player) => Number.isInteger(player.mmr))
        ? players.reduce((sum, player) => sum + player.mmr, 0)
        : null;
      if (
        Number.isInteger(team.mmrTotal) &&
        Number.isInteger(metadata.mmrLimit) &&
        team.mmrTotal > metadata.mmrLimit
      ) {
        discrepancies.push(
          `${team.teamName}: сумма ММР по справочному листу ${team.mmrTotal}, что выше указанного лимита ${metadata.mmrLimit}.`,
        );
      }
    }
  }
  const missing = teams.filter((team) => !team.players);
  if (missing.length) {
    throw new Error(
      `${workbook.FileName}: не найдены составы команд ${missing.map((team) => team.teamName).join(", ")}`,
    );
  }
};

const parsePlacements = (rows, teams, metadata, discrepancies) => {
  const titleRow = rows.findIndex((row) =>
    row.some((value) => key(value) === "итоговое положение команд"),
  );
  if (titleRow < 0) return;
  const teamByName = new Map(teams.map((team) => [key(team.teamName), team]));
  for (let rowIndex = titleRow + 2; rowIndex < rows.length; rowIndex += 1) {
    const placementText = clean(rows[rowIndex][3]);
    const sourceTeamName = clean(rows[rowIndex][4]);
    if (!placementText && !sourceTeamName) continue;
    const team = teamByName.get(key(canonicalTeamName(sourceTeamName, metadata)));
    if (!placementText || !team) continue;
    const placement = numberFrom(placementText.match(/^\d+/)?.[0]);
    if (!Number.isInteger(placement)) continue;
    team.placement = placement;
    team.prizeText = clean(rows[rowIndex][5]) || null;
    team.resultLabel =
      placement === 1
        ? "Победитель"
        : placement === 2
          ? "Финалист"
          : placementText.replace("-", "–") + "-е место";
  }
  for (const [teamName, placement, resultLabel] of metadata.placementOverrides ?? []) {
    const team = teamByName.get(key(teamName));
    if (!team) throw new Error(`Не найдена команда для итогового места: ${teamName}`);
    team.placement = placement;
    team.resultLabel = resultLabel;
  }
  for (const [teamName, resultLabel] of metadata.resultLabelOverrides ?? []) {
    const team = teamByName.get(key(teamName));
    if (!team) throw new Error(`Не найдена команда для итоговой отметки: ${teamName}`);
    team.resultLabel = resultLabel;
  }
  if ((metadata.placementOverrides ?? []).length) {
    discrepancies.push(
      "Итоговые места в нижней таблице не заполнены; 1–3-е места восстановлены по результатам гранд-финала и плей-офф.",
    );
  }
};

const parseGroupOrder = (rows, teams, metadata) => {
  const titles = [];
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, value] of row.entries()) {
      if (/^(общая группа|группа\s+[а-яa-z])$/i.test(clean(value))) {
        titles.push({ rowIndex, columnIndex, groupName: clean(value) });
      }
    }
  }
  const order = [];
  const teamNames = new Set(teams.map((team) => key(team.teamName)));
  for (const title of titles) {
    for (let rowIndex = title.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const teamName = canonicalTeamName(rows[rowIndex][title.columnIndex], metadata);
      if (!teamNames.has(key(teamName))) break;
      const explicitOrder = numberFrom(rows[rowIndex][title.columnIndex - 1]);
      order.push({
        teamName,
        sortOrder: explicitOrder ?? order.filter((entry) => entry.groupName === title.groupName).length + 1,
        groupName: title.groupName,
      });
    }
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
  const labelA = key(match.labelA);
  const labelB = key(match.labelB);
  if (labelA === "w" || labelA === ">" || ["ff", "тп", "тл"].includes(labelB)) {
    return { winner: match.teamA, loser: match.teamB };
  }
  if (labelB === "w" || labelB === ">" || ["ff", "тп", "тл"].includes(labelA)) {
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
        : stageName === "third"
          ? entry[3].includes("3-е место")
        : entry[3].includes("Плей-офф"),
  );
  return `${schedule[0]}T${time || schedule[2]}:00+03:00`;
};

const parseMatches = (rows, metadata, discrepancies) => {
  if (metadata.playoffType === "double_elimination") {
    return parseDoubleEliminationMatches({
      rows, metadata, clean, key, scoreFrom, matchResult, winnerAndLoser,
      canonicalTeamName,
    });
  }
  const matches = [];
  const seenGroupHeaders = new Set();
  const groupSlots = new Map();
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, value] of row.entries()) {
      const header = clean(value);
      const groupHeader = header.match(/^ГЭ\s+(\d+)\.(\d+)(?:\s+([А-ЯA-Z]))?\s*\[/i);
      if (!groupHeader) continue;
      const roundNumber = Number(groupHeader[1]);
      const sourceKey = `${roundNumber}.${groupHeader[2]}${groupHeader[3] ? ` ${groupHeader[3]}` : ""}`;
      if (seenGroupHeaders.has(sourceKey)) {
        discrepancies.push(
          `В сетке дважды указан заголовок «ГЭ ${sourceKey}»; матчи сохранены по фактическим парам команд.`,
        );
      }
      seenGroupHeaders.add(sourceKey);
      const slot = (groupSlots.get(roundNumber) ?? 0) + 1;
      groupSlots.set(roundNumber, slot);
      const teamA = canonicalTeamName(rows[rowIndex + 1]?.[columnIndex], metadata);
      const teamB = canonicalTeamName(rows[rowIndex + 2]?.[columnIndex], metadata);
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
        groupName: groupHeader[3]
          ? `Группа ${groupHeader[3].toUpperCase()}`
          : metadata.defaultGroupName ?? "Общая группа",
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
      const playoffHeader = header.match(/^(ГФ|ИЗ3|ПФ(?:\s+\d+)?|ПО(?:\s+(?:Р?\d+(?:\.\d+)?))?)\s*\[/i);
      if (!playoffHeader) continue;
      const isFinal = key(playoffHeader[1]) === "гф";
      const isThird = key(playoffHeader[1]) === "из3";
      const teamA = canonicalTeamName(rows[rowIndex + 1]?.[columnIndex], metadata);
      const teamB = canonicalTeamName(rows[rowIndex + 2]?.[columnIndex], metadata);
      const time = header.match(/(\d{1,2}:\d{2})/)?.[1] ?? "";
      const result = matchResult(
        teamA,
        teamB,
        scoreFrom(rows, rowIndex + 1, columnIndex),
        scoreFrom(rows, rowIndex + 2, columnIndex),
      );
      const schedule = metadata.schedules.find((entry) =>
        isFinal ? entry[3] === "Гранд-финал"
          : isThird ? entry[3].includes("3-е место") : entry[3].includes("Плей-офф"),
      );
      playoffMatches.push({
        matchKey: isFinal ? "gf" : isThird ? "third-place" : `sf${playoffMatches.filter((match) => !match.isFinal && !match.isThird).length + 1}`,
        stage: isFinal ? "Гранд-финал" : isThird ? "Матч за 3-е место" : "Плей-офф · Полуфинал",
        groupName: null,
        teamA,
        teamB,
        bestOf: seriesBestOf(schedule[5]),
        scheduledAt: scheduledAt(metadata, isFinal ? "final" : isThird ? "third" : "playoff", null, time),
        bracketSide: isFinal ? "grand_final" : isThird ? null : "upper",
        bracketSlot: isFinal || isThird ? 1 : playoffMatches.filter((match) => !match.isFinal && !match.isThird).length + 1,
        isFinal,
        isThird,
        ...result,
      });
    }
  }
  const final = playoffMatches.find((match) => match.isFinal);
  const thirdPlace = playoffMatches.find((match) => match.isThird);
  const semifinals = playoffMatches.filter((match) => !match.isFinal && !match.isThird);
  for (const semifinal of semifinals) {
    const outcome = winnerAndLoser(semifinal);
    semifinal.bracketRound = 1;
    semifinal.winnerToKey = "gf";
    semifinal.winnerToSlot = key(outcome.winner) === key(final.teamA) ? "a" : "b";
    if (thirdPlace) {
      semifinal.loserToKey = "third-place";
      semifinal.loserToSlot = key(outcome.loser) === key(thirdPlace.teamA) ? "a" : "b";
    } else semifinal.eliminatedTeam = outcome.loser;
  }
  if (final) {
    final.bracketRound = semifinals.length ? 2 : 1;
    final.eliminatedTeam = winnerAndLoser(final).loser;
  }
  if (thirdPlace) thirdPlace.eliminatedTeam = winnerAndLoser(thirdPlace).loser;
  return [...matches, ...semifinals, final, thirdPlace].filter(Boolean).map((match, index) => ({
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
    const playerReference = parsePlayerReferenceSheet(workbook);
    const teams = parseTeams(rows);
    parseRosters(workbook, teams, playerReference.entries, metadata, discrepancies);
    parsePlacements(rows, teams, metadata, discrepancies);
    const matches = parseMatches(rows, metadata, discrepancies);
    const groupOrder = parseGroupOrder(rows, teams, metadata);
    const rules = parseRules(workbook, discrepancies);
    return {
      number,
      name: `LS Fastcup #${number}`,
      metadata,
      teams,
      matches,
      groupOrder,
      rules,
      hasTierSheet: playerReference.kind === "tier",
      hasMmrSheet: playerReference.kind === "mmr",
      discrepancies,
    };
  });
}
