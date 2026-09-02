const stageDefinitions = {
  "вс р8": {
    stage: "Верхняя сетка · Раунд 1",
    bracketSide: "upper",
    bracketRound: 1,
    progressionRank: 1,
    bestOf: 1,
    keyPrefix: "u1",
  },
  "вс р4": {
    stage: "Верхняя сетка · Раунд 2",
    bracketSide: "upper",
    bracketRound: 2,
    progressionRank: 2,
    bestOf: 1,
    keyPrefix: "u2",
  },
  "вс р2": {
    stage: "Верхняя сетка · Финал",
    bracketSide: "upper",
    bracketRound: 3,
    progressionRank: 3,
    bestOf: 3,
    keyPrefix: "uf",
  },
  "нс р4а": {
    stage: "Нижняя сетка · Раунд 1",
    bracketSide: "lower",
    bracketRound: 1,
    progressionRank: 2,
    bestOf: 1,
    keyPrefix: "l1",
  },
  "нс р4б": {
    stage: "Нижняя сетка · Раунд 2",
    bracketSide: "lower",
    bracketRound: 2,
    progressionRank: 3,
    bestOf: 1,
    keyPrefix: "l2",
  },
  "нс р2а": {
    stage: "Нижняя сетка · Раунд 3",
    bracketSide: "lower",
    bracketRound: 3,
    progressionRank: 4,
    bestOf: 1,
    keyPrefix: "l3",
  },
  "нс р2б": {
    stage: "Нижняя сетка · Финал",
    bracketSide: "lower",
    bracketRound: 4,
    progressionRank: 5,
    bestOf: 1,
    keyPrefix: "lf",
  },
  "гранд финал": {
    stage: "Гранд-финал",
    bracketSide: "grand_final",
    bracketRound: 5,
    progressionRank: 6,
    bestOf: 3,
    keyPrefix: "gf",
    isFinal: true,
  },
};

const scheduledAtFromHeader = (header, metadata) => {
  const dayNumber = Number(header.match(/день\s*(\d+)/i)?.[1]);
  const time = header.match(/(\d{1,2}:\d{2})/)?.[1];
  const date = metadata.dayDates?.[dayNumber - 1];
  if (!date || !time) {
    throw new Error(`Не удалось определить дату матча из заголовка «${header}»`);
  }
  return `${date}T${time}:00+03:00`;
};

const targetForTeam = (matches, sourceMatch, teamName, key) => {
  if (!teamName) return;
  const candidates = matches
    .filter((match) =>
      match.progressionRank > sourceMatch.progressionRank &&
      (key(match.teamA) === key(teamName) || key(match.teamB) === key(teamName)))
    .sort((left, right) =>
      left.progressionRank - right.progressionRank ||
      left.scheduledAt.localeCompare(right.scheduledAt));
  return candidates[0];
};

const linkProgression = (matches, winnerAndLoser, key) => {
  for (const match of matches) {
    const outcome = winnerAndLoser(match);
    const winnerTarget = targetForTeam(matches, match, outcome.winner, key);
    const loserTarget = targetForTeam(matches, match, outcome.loser, key);
    if (winnerTarget) {
      match.winnerToKey = winnerTarget.matchKey;
      match.winnerToSlot = key(winnerTarget.teamA) === key(outcome.winner) ? "a" : "b";
    }
    if (loserTarget) {
      match.loserToKey = loserTarget.matchKey;
      match.loserToSlot = key(loserTarget.teamA) === key(outcome.loser) ? "a" : "b";
    } else if (match.bracketSide === "lower" || match.isFinal) {
      match.eliminatedTeam = outcome.loser;
    }
  }
};

export const parseDoubleEliminationMatches = ({
  rows,
  metadata,
  clean,
  key,
  scoreFrom,
  matchResult,
  winnerAndLoser,
  canonicalTeamName,
}) => {
  const stageTitles = [];
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, value] of row.entries()) {
      const definition = stageDefinitions[key(value)];
      if (definition) stageTitles.push({ rowIndex, columnIndex, definition });
    }
  }
  const matches = [];
  const slots = new Map();
  for (const title of stageTitles) {
    const nextTitle = stageTitles
      .filter((candidate) =>
        candidate.columnIndex === title.columnIndex &&
        candidate.rowIndex > title.rowIndex)
      .sort((left, right) => left.rowIndex - right.rowIndex)[0];
    const endRow = nextTitle?.rowIndex ?? rows.length;
    for (let rowIndex = title.rowIndex + 1; rowIndex < endRow; rowIndex += 1) {
      const header = clean(rows[rowIndex]?.[title.columnIndex]);
      if (!/\[день\s*\d+\s*-\s*\d{1,2}:\d{2}\]/i.test(header)) continue;
      const teamA = canonicalTeamName(rows[rowIndex + 1]?.[title.columnIndex], metadata);
      const teamB = canonicalTeamName(rows[rowIndex + 2]?.[title.columnIndex], metadata);
      if (!teamA || !teamB) continue;
      const slotKey = `${title.definition.bracketSide}:${title.definition.bracketRound}`;
      const slot = (slots.get(slotKey) ?? 0) + 1;
      slots.set(slotKey, slot);
      const matchKey = title.definition.isFinal
        ? "gf"
        : `${title.definition.keyPrefix}-${slot}`;
      matches.push({
        matchKey,
        stage: title.definition.stage,
        groupName: null,
        teamA,
        teamB,
        bestOf: title.definition.bestOf,
        scheduledAt: scheduledAtFromHeader(header, metadata),
        bracketRound: title.definition.bracketRound,
        bracketSide: title.definition.bracketSide,
        bracketSlot: slot,
        progressionRank: title.definition.progressionRank,
        isFinal: Boolean(title.definition.isFinal),
        ...matchResult(
          teamA,
          teamB,
          scoreFrom(rows, rowIndex + 1, title.columnIndex),
          scoreFrom(rows, rowIndex + 2, title.columnIndex),
        ),
      });
    }
  }
  linkProgression(matches, winnerAndLoser, key);
  return matches
    .sort((left, right) =>
      left.progressionRank - right.progressionRank ||
      left.bracketRound - right.bracketRound ||
      left.bracketSlot - right.bracketSlot)
    .map(({ progressionRank, ...match }, index) => ({
      ...match,
      sortOrder: index + 1,
    }));
};
